import torch
import torch.nn as nn

class AttentionLayer(nn.Module):
    """Self-attention mechanism to focus on important parts of sequence"""
    def __init__(self, hidden_size):
        super().__init__()
        self.attention = nn.MultiheadAttention(hidden_size, num_heads=4, batch_first=True, dropout=0.1)
        self.norm = nn.LayerNorm(hidden_size)
        
    def forward(self, x):
        # x: (batch_size, seq_len, hidden_size)
        attn_out, _ = self.attention(x, x, x)
        return self.norm(x + attn_out)

class PurchaseSeqClassifier(nn.Module):
    def __init__(self, vocab_size=8, embed_dim=32, hidden_size=64, num_layers=2, dropout=0.3, rnn_type="lstm"):
        super().__init__()
        self.rnn_type = rnn_type.lower()
        self.hidden_size = hidden_size
        
        # Embedding with higher dimension
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        
        # Bidirectional RNN for better context understanding
        if self.rnn_type == "lstm":
            self.rnn = nn.LSTM(
                input_size=embed_dim,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                dropout=dropout if num_layers > 1 else 0.0,
                bidirectional=True
            )
        elif self.rnn_type == "gru":
            self.rnn = nn.GRU(
                input_size=embed_dim,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                dropout=dropout if num_layers > 1 else 0.0,
                bidirectional=True
            )
        else:
            raise ValueError(f"Unknown rnn_type: {rnn_type}")
        
        # Attention layer
        self.attention = AttentionLayer(hidden_size * 2)  # *2 for bidirectional
        
        self.dropout = nn.Dropout(dropout)
        
        # Enhanced classifier head with batch normalization
        self.fc1 = nn.Linear(hidden_size * 2, hidden_size)  # *2 for bidirectional
        self.bn1 = nn.BatchNorm1d(hidden_size)
        self.relu = nn.ReLU()
        
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.bn2 = nn.BatchNorm1d(hidden_size // 2)
        
        self.fc3 = nn.Linear(hidden_size // 2, 1)
        
    def forward(self, x):
        # x: (batch_size, seq_len)
        embeds = self.embedding(x)  # (batch_size, seq_len, embed_dim)
        embeds = self.dropout(embeds)
        
        if self.rnn_type == "lstm":
            rnn_out, (h_n, c_n) = self.rnn(embeds)
        else:
            rnn_out, h_n = self.rnn(embeds)
        
        # Apply attention on RNN output
        rnn_out = self.attention(rnn_out)  # (batch_size, seq_len, hidden_size*2)
        
        # For bidirectional RNN:
        # h_n shape: (num_layers*2, batch_size, hidden_size)
        # We need to concatenate forward and backward final states
        # h_n[-2] is forward of last layer, h_n[-1] is backward of last layer
        forward_hidden = h_n[-2]  # (batch_size, hidden_size)
        backward_hidden = h_n[-1]  # (batch_size, hidden_size)
        last_hidden = torch.cat([forward_hidden, backward_hidden], dim=1)  # (batch_size, hidden_size*2)
        
        # Average pooling over sequence
        mean_pool = rnn_out.mean(dim=1)  # (batch_size, hidden_size*2)
        
        # Concatenate different representations
        combined = last_hidden + mean_pool  # (batch_size, hidden_size*2)
        
        # Classifier with improved architecture
        out = self.fc1(self.dropout(combined))
        out = self.bn1(out)
        out = self.relu(out)
        
        out = self.fc2(self.dropout(out))
        out = self.bn2(out)
        out = self.relu(out)
        
        logits = self.fc3(self.dropout(out))  # (batch_size, 1)
        
        return logits.squeeze(1)  # (batch_size,)
