from django.core.management.base import BaseCommand
from catalog.models import Product
from ai.models import ProductEmbedding
from ai.services import EmbeddingService

class Command(BaseCommand):
    help = "Generates text embeddings for all products in the database in batches and saves them to the ProductEmbedding table."

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing product embeddings',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of products to process',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=256,
            help='Batch size for sentence embedding encoding',
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        limit = options['limit']
        batch_size = options['batch_size']

        products = Product.objects.all()
        if not overwrite:
            # Optimize: exclude products that already have embeddings at the DB level
            existing_ids = ProductEmbedding.objects.values_list('product_id', flat=True)
            products = products.exclude(id__in=existing_ids)

        if limit:
            products = products[:limit]

        total = products.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("All products already have embeddings. Nothing to do!"))
            return

        self.stdout.write(self.style.SUCCESS(f"Found {total} products that need embeddings. Loading Sentence Transformer model..."))
        
        # Load model
        model = EmbeddingService.get_model()
        
        products_list = list(products)
        self.stdout.write(f"Encoding descriptions and saving to database in batches of {batch_size}...")

        success_count = 0
        for i in range(0, total, batch_size):
            batch_products = products_list[i : i + batch_size]
            
            # Generate texts
            texts = [EmbeddingService.generate_text_representation(p) for p in batch_products]
            
            try:
                # Batch encode using PyTorch under the hood
                vectors = model.encode(texts, batch_size=len(texts), show_progress_bar=False)
                
                # Bulk create or update
                embeddings_to_create = []
                for product, vector in zip(batch_products, vectors):
                    # If overwrite, delete first
                    if overwrite:
                        ProductEmbedding.objects.filter(product=product).delete()
                    embeddings_to_create.append(
                        ProductEmbedding(product=product, embedding_vector=vector.tolist())
                    )
                
                ProductEmbedding.objects.bulk_create(embeddings_to_create)
                success_count += len(batch_products)
                self.stdout.write(f"Processed and saved {success_count}/{total} products...")
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error encoding batch starting at index {i}: {str(e)}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Embedding generation completed! Created/Updated: {success_count} product embeddings."
            )
        )

        # Synchronize and compute similarity graph in Neo4j
        self.stdout.write("Synchronizing product embeddings and calculating similarity relationships in Neo4j...")
        try:
            import numpy as np
            from ai.neo4j_service import Neo4jService
            
            # Fetch all embeddings
            all_embeddings = list(ProductEmbedding.objects.all().select_related('product'))
            if not all_embeddings:
                self.stdout.write("No product embeddings found to synchronize with Neo4j.")
                return

            self.stdout.write(f"Syncing {len(all_embeddings)} products to Neo4j...")
            for i, emb in enumerate(all_embeddings):
                Neo4jService.sync_product(emb.product_id, emb.product.name)
                if (i + 1) % 500 == 0 or (i + 1) == len(all_embeddings):
                    self.stdout.write(f"  [Node Sync] Synced {i + 1}/{len(all_embeddings)} product nodes...")

            # Compute similarities in memory
            prod_ids = [emb.product_id for emb in all_embeddings]
            vectors = np.array([emb.embedding_vector for emb in all_embeddings]) # Shape: (N, 384)

            # Normalize vectors
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            vectors_normalized = vectors / norms

            # Compute similarity matrix (N x N)
            sim_matrix = np.dot(vectors_normalized, vectors_normalized.T)

            # Map similarities back to Neo4j
            self.stdout.write("Writing SIMILAR relationships to Neo4j (top 5 per product)...")
            relationship_count = 0
            total_prods = len(prod_ids)
            for idx, p_id in enumerate(prod_ids):
                # Sort similarities for this product
                sim_scores = sim_matrix[idx]
                # Get indices of sorted similarities (ascending)
                sorted_indices = np.argsort(sim_scores)
                # We want descending order, excluding the product itself (which will have similarity 1.0)
                # Let's take the last 6 indices (which includes itself) and filter itself out
                top_indices = sorted_indices[-6:][::-1]
                
                count = 0
                for top_idx in top_indices:
                    other_id = prod_ids[top_idx]
                    if other_id == p_id:
                        continue
                    
                    score = float(sim_scores[top_idx])
                    # Normalize score to [0, 1] range (cosine similarity is in [-1, 1])
                    score_norm = (score + 1.0) / 2.0
                    
                    Neo4jService.create_similarity_relationship(p_id, other_id, score_norm)
                    relationship_count += 1
                    count += 1
                    if count >= 5: # top 5 similar
                        break
                
                # Print progress logs
                if (idx + 1) % 100 == 0 or (idx + 1) == total_prods:
                    self.stdout.write(f"  [Edge Sync] Processed similarities for {idx + 1}/{total_prods} products (Created {relationship_count} relationships)...")

            self.stdout.write(self.style.SUCCESS(f"Successfully created {relationship_count} similarity relationships in Neo4j."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to synchronize Neo4j graph: {str(e)}"))
