import argparse
import os
import torch
import torch.nn as nn
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from tqdm import tqdm
from sklearn.metrics import roc_auc_score, average_precision_score, precision_recall_fscore_support, accuracy_score
from tabulate import tabulate

from data.purchase_dataset import get_purchase_dataloaders
from models.purchase_model import PurchaseSeqClassifier

class FocalLoss(nn.Module):
    """Focal Loss for handling class imbalance - focuses on hard examples"""
    def __init__(self, alpha=1.0, gamma=2.0, pos_weight=None):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.pos_weight = pos_weight
        
    def forward(self, inputs, targets):
        # inputs: logits (batch_size,)
        # targets: binary labels (batch_size,)
        
        bce_loss = nn.functional.binary_cross_entropy_with_logits(
            inputs, targets, reduction='none', pos_weight=self.pos_weight
        )
        
        # Get probabilities
        p = torch.sigmoid(inputs)
        
        # Calculate focal term: (1-p)^gamma for positive, p^gamma for negative
        p_t = torch.where(targets == 1, p, 1 - p)
        focal_term = (1 - p_t) ** self.gamma
        
        # Apply focal loss
        loss = self.alpha * focal_term * bce_loss
        return loss.mean()

def parse_args():
    parser = argparse.ArgumentParser(description="Sequential Purchase Prediction Training")
    parser.add_argument("--csv-path", default="./data/sequential/sequential_events.csv", help="Path to events CSV")
    parser.add_argument("--model", choices=["lstm", "gru"], default="lstm", help="RNN architecture")
    parser.add_argument("--epochs", type=int, default=20, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0005, help="Learning rate")
    parser.add_argument("--weight-decay", type=float, default=0.0001, help="Weight decay for L2 regularization")
    parser.add_argument("--patience", type=int, default=8, help="Early stopping patience")
    parser.add_argument("--seq-len", type=int, default=10, help="Input sequence length")
    parser.add_argument("--embed-dim", type=int, default=32, help="Embedding dimension")
    parser.add_argument("--hidden-size", type=int, default=64, help="RNN hidden size")
    parser.add_argument("--num-layers", type=int, default=2, help="RNN layers count")
    parser.add_argument("--dropout", type=float, default=0.3, help="Dropout probability")
    parser.add_argument("--use-focal", action="store_true", default=True, help="Use Focal Loss instead of BCE")
    parser.add_argument("--fig-dir", default="./data/sequential/figures", help="Directory to save plots")
    return parser.parse_args()

def evaluate(model, loader, criterion, device, threshold=0.5):
    model.eval()
    total_loss = 0.0
    all_targets = []
    all_outputs = []
    
    with torch.no_grad():
        for batch in loader:
            seq = batch['sequence'].to(device)
            target = batch['label'].to(device)
            
            logits = model(seq)
            loss = criterion(logits, target)
            total_loss += loss.item()
            
            probs = torch.sigmoid(logits)
            all_targets.extend(target.cpu().numpy())
            all_outputs.extend(probs.cpu().numpy())
            
    avg_loss = total_loss / len(loader)
    all_targets = np.array(all_targets)
    all_outputs = np.array(all_outputs)
    
    # Calculate metrics
    auc = roc_auc_score(all_targets, all_outputs)
    pr_auc = average_precision_score(all_targets, all_outputs)
    
    # Convert probabilities to binary predictions (with flexible threshold)
    preds = (all_outputs >= threshold).astype(float)
    acc = accuracy_score(all_targets, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, preds, average='binary', zero_division=0)
    
    return {
        "loss": avg_loss,
        "auc": auc,
        "pr_auc": pr_auc,
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "probs": all_outputs,
        "targets": all_targets
    }

def find_optimal_threshold(model, loader, criterion, device, metric='f1'):
    """Find optimal threshold that maximizes F1-score or precision-recall tradeoff"""
    metrics = evaluate(model, loader, criterion, device, threshold=0.5)
    probs = metrics['probs']
    targets = metrics['targets']
    
    best_threshold = 0.5
    best_score = 0.0
    threshold_results = []
    
    # Test thresholds from 0.1 to 0.9
    for threshold in np.arange(0.1, 1.0, 0.05):
        preds = (probs >= threshold).astype(float)
        
        if metric == 'f1':
            _, _, f1, _ = precision_recall_fscore_support(targets, preds, average='binary', zero_division=0)
            score = f1
        elif metric == 'precision':
            precision, _, _, _ = precision_recall_fscore_support(targets, preds, average='binary', zero_division=0)
            score = precision
        elif metric == 'recall':
            _, recall, _, _ = precision_recall_fscore_support(targets, preds, average='binary', zero_division=0)
            score = recall
        else:  # 'balanced' - prioritize both precision and recall
            precision, recall, f1, _ = precision_recall_fscore_support(targets, preds, average='binary', zero_division=0)
            score = (precision + recall) / 2
            
        threshold_results.append((threshold, score))
        
        if score > best_score:
            best_score = score
            best_threshold = threshold
    
    return best_threshold, best_score, threshold_results

def main():
    args = parse_args()
    os.makedirs("checkpoints", exist_ok=True)
    os.makedirs(args.fig_dir, exist_ok=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Load data loaders
    print(f"Loading data from {args.csv_path}...")
    train_loader, val_loader, test_loader = get_purchase_dataloaders(
        csv_path=args.csv_path,
        batch_size=args.batch_size,
        seq_len=args.seq_len
    )
    
    # Calculate pos_weight for class imbalance
    train_labels = train_loader.dataset.labels.numpy()
    num_pos = np.sum(train_labels == 1.0)
    num_neg = np.sum(train_labels == 0.0)
    pos_weight_val = num_neg / max(num_pos, 1)
    print(f"Class distribution in Train: Positive={num_pos}, Negative={num_neg}")
    print(f"Calculated pos_weight: {pos_weight_val:.4f}")
    
    pos_weight = torch.tensor([pos_weight_val], dtype=torch.float32, device=device)
    
    # Use Focal Loss for better handling of class imbalance
    if args.use_focal:
        criterion = FocalLoss(alpha=1.0, gamma=2.0, pos_weight=pos_weight)
    else:
        criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    
    # Build model with improved architecture
    model = PurchaseSeqClassifier(
        vocab_size=8,  # Maps elements 0-7
        embed_dim=args.embed_dim,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        dropout=args.dropout,
        rnn_type=args.model
    ).to(device)
    
    # Use Adam optimizer with weight decay
    optimizer = torch.optim.Adam(
        model.parameters(), 
        lr=args.lr,
        weight_decay=args.weight_decay
    )
    
    # Learning rate scheduler - reduce LR if validation AUC plateaus
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, 
        mode='max', 
        factor=0.5, 
        patience=3,
        min_lr=1e-6
    )
    
    # Metrics history
    history = {
        "epoch": [],
        "train_loss": [],
        "val_loss": [],
        "val_auc": [],
        "val_pr_auc": [],
        "val_accuracy": [],
        "val_precision": [],
        "val_recall": [],
        "val_f1": []
    }
    
    best_auc = 0.0
    patience_counter = 0
    checkpoint_path = f"checkpoints/best_purchase_{args.model}.pt"
    log_file_path = os.path.join(args.fig_dir, "purchase_train.log")
    
    # Clear log file if it exists
    if os.path.exists(log_file_path):
        os.remove(log_file_path)
        
    def log_print(msg):
        print(msg)
        with open(log_file_path, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    
    log_print(f"Model Configuration:")
    log_print(f"  - RNN Type: {args.model.upper()}")
    log_print(f"  - Embedding Dim: {args.embed_dim}")
    log_print(f"  - Hidden Size: {args.hidden_size}")
    log_print(f"  - Num Layers: {args.num_layers}")
    log_print(f"  - Dropout: {args.dropout}")
    log_print(f"  - Loss: {'Focal Loss' if args.use_focal else 'BCE with pos_weight'}")
    log_print(f"  - Learning Rate: {args.lr}")
    log_print(f"  - Weight Decay: {args.weight_decay}")
    log_print(f"  - Patience: {args.patience}")
    log_print("")
            
    log_print("Starting training...")
    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        train_bar = tqdm(train_loader, desc=f"Epoch {epoch}/{args.epochs}", leave=False)
        
        for batch in train_bar:
            seq = batch['sequence'].to(device)
            target = batch['label'].to(device)
            
            optimizer.zero_grad()
            logits = model(seq)
            loss = criterion(logits, target)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            train_bar.set_postfix({"loss": f"{loss.item():.4f}"})
            
        avg_train_loss = train_loss / len(train_loader)
        val_metrics = evaluate(model, val_loader, criterion, device, threshold=0.5)
        
        history["epoch"].append(epoch)
        history["train_loss"].append(avg_train_loss)
        history["val_loss"].append(val_metrics["loss"])
        history["val_auc"].append(val_metrics["auc"])
        history["val_pr_auc"].append(val_metrics["pr_auc"])
        history["val_accuracy"].append(val_metrics["accuracy"])
        history["val_precision"].append(val_metrics["precision"])
        history["val_recall"].append(val_metrics["recall"])
        history["val_f1"].append(val_metrics["f1"])
        
        log_print(f"Epoch {epoch:02d}: train_loss={avg_train_loss:.4f} | "
                  f"val_loss={val_metrics['loss']:.4f} | val_auc={val_metrics['auc']:.4f} | "
                  f"val_pr_auc={val_metrics['pr_auc']:.4f} | F1={val_metrics['f1']:.4f}")
              
        # Checkpoint based on Validation AUC (early stopping signal)
        if val_metrics["auc"] > best_auc:
            best_auc = val_metrics["auc"]
            patience_counter = 0
            torch.save(model.state_dict(), checkpoint_path)
            log_print(f"  --> Saved new best checkpoint to {checkpoint_path}")
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                log_print(f"Early stopping at epoch {epoch}")
                break
        
        # Update learning rate based on validation AUC
        scheduler.step(val_metrics["auc"])
                
    # Save training log to CSV
    import pandas as pd
    log_csv_path = os.path.join(args.fig_dir, "purchase_training_log.csv")
    pd.DataFrame(history).to_csv(log_csv_path, index=False)
    log_print(f"\nTraining metrics log saved to {log_csv_path}")
                
    # Load best model for testing
    log_print(f"\nLoading best model checkpoint from {checkpoint_path}...")
    model.load_state_dict(torch.load(checkpoint_path))
    
    # Find optimal threshold on validation set
    log_print("\nFinding optimal threshold on validation set...")
    optimal_threshold, best_f1, threshold_results = find_optimal_threshold(
        model, val_loader, criterion, device, metric='f1'
    )
    log_print(f"Optimal threshold: {optimal_threshold:.3f} (F1={best_f1:.4f})")
    
    # Evaluate on test set with optimal threshold
    test_metrics = evaluate(model, test_loader, criterion, device, threshold=optimal_threshold)
    
    # Also show metrics at threshold 0.5 for comparison
    test_metrics_baseline = evaluate(model, test_loader, criterion, device, threshold=0.5)
    
    # Print results in a formatted table - showing both thresholds
    results_table = [
        ["Metric", "Value (Optimal Thr)", "Value (Thr=0.5)"],
        ["Test Loss", f"{test_metrics['loss']:.4f}", f"{test_metrics_baseline['loss']:.4f}"],
        ["Classification Threshold", f"{optimal_threshold:.3f}", "0.500"],
        ["Test Accuracy", f"{test_metrics['accuracy']:.4f}", f"{test_metrics_baseline['accuracy']:.4f}"],
        ["Test ROC AUC", f"{test_metrics['auc']:.4f}", f"{test_metrics_baseline['auc']:.4f}"],
        ["Test PR AUC", f"{test_metrics['pr_auc']:.4f}", f"{test_metrics_baseline['pr_auc']:.4f}"],
        ["Test Precision", f"{test_metrics['precision']:.4f}", f"{test_metrics_baseline['precision']:.4f}"],
        ["Test Recall", f"{test_metrics['recall']:.4f}", f"{test_metrics_baseline['recall']:.4f}"],
        ["Test F1-Score", f"{test_metrics['f1']:.4f}", f"{test_metrics_baseline['f1']:.4f}"]
    ]
    log_print("\n" + "="*60)
    log_print("TEST EVALUATION RESULTS")
    log_print("="*60)
    log_print(tabulate(results_table, headers="firstrow", tablefmt="grid"))
    
    # Save training visualization plots
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # Loss Plot
    axes[0, 0].plot(history["epoch"], history["train_loss"], label="Train Loss", marker='o')
    axes[0, 0].plot(history["epoch"], history["val_loss"], label="Val Loss", marker='o')
    axes[0, 0].set_xlabel("Epoch")
    axes[0, 0].set_ylabel("Loss")
    axes[0, 0].set_title("Loss Curve")
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # AUC Plot
    axes[0, 1].plot(history["epoch"], history["val_auc"], label="Val ROC AUC", color="orange", marker='o')
    axes[0, 1].plot(history["epoch"], history["val_pr_auc"], label="Val PR AUC", color="green", marker='o')
    axes[0, 1].set_xlabel("Epoch")
    axes[0, 1].set_ylabel("Score")
    axes[0, 1].set_title("AUC Metrics")
    axes[0, 1].legend()
    axes[0, 1].grid(True)
    
    # Threshold Optimization Plot
    thresholds = [t[0] for t in threshold_results]
    scores = [t[1] for t in threshold_results]
    axes[1, 0].plot(thresholds, scores, marker='o', color='red', linewidth=2, label='F1-Score')
    axes[1, 0].axvline(optimal_threshold, color='green', linestyle='--', linewidth=2, label=f'Optimal: {optimal_threshold:.3f}')
    axes[1, 0].axvline(0.5, color='gray', linestyle=':', linewidth=2, label='Default: 0.5')
    axes[1, 0].set_xlabel("Classification Threshold")
    axes[1, 0].set_ylabel("F1-Score")
    axes[1, 0].set_title("Threshold Optimization on Validation Set")
    axes[1, 0].legend()
    axes[1, 0].grid(True)
    
    # F1 Score Progression
    axes[1, 1].plot(history["epoch"], history["val_f1"], label="Val F1-Score", color="purple", marker='s', linewidth=2)
    axes[1, 1].set_xlabel("Epoch")
    axes[1, 1].set_ylabel("F1-Score")
    axes[1, 1].set_title("F1-Score During Training")
    axes[1, 1].legend()
    axes[1, 1].grid(True)
    
    plt.tight_layout()
    plot_path = os.path.join(args.fig_dir, "purchase_metrics.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    log_print(f"\nVisualization plot saved successfully to {plot_path}")

if __name__ == "__main__":
    main()
