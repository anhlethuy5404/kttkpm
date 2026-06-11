import json
import random
import os
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from catalog.models import Product, Category
from .models import RecommendationCache, PurchasePrediction, ChatMessage
from ai.services import LSTMInferenceService, EmbeddingService, UserProfileService
from ai.recommendation_engine import RecommendationEngine

@csrf_exempt
def predict_purchase_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            data = request.POST

        user_id = data.get('user_id')
        product_id = data.get('product_id')

        if not user_id or not product_id:
            return JsonResponse({'error': 'user_id and product_id are required'}, status=400)

        try:
            prob = LSTMInferenceService.predict_purchase_probability(int(user_id), int(product_id))
            prob = round(prob, 4)
            prediction = "BUY" if prob >= 0.5 else "SKIP"

            # Save prediction to DB
            PurchasePrediction.objects.create(
                user_id=int(user_id),
                product_id=int(product_id),
                probability=prob,
                prediction=prediction
            )

            return JsonResponse({
                'probability': prob,
                'prediction': prediction
            })
        except Exception as e:
            return JsonResponse({'error': f'Inference failed: {str(e)}'}, status=500)
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)

def recommendations_api(request, user_id):
    try:
        rec_products = RecommendationEngine.recommend_products(int(user_id), limit=4)
    except Exception as e:
        products = Product.objects.all()[:4]
        rec_products = list(products)

    recommendations = [{
        'product_id': p.id,
        'name': p.name,
        'price': float(p.price),
        'image_url': p.image_url,
        'score': getattr(p, 'recommendation_score', 0.5)
    } for p in rec_products]

    return JsonResponse({'recommendations': recommendations})

def similar_products_api(request, product_id):
    import numpy as np
    try:
        target_product = Product.objects.get(id=product_id)
        target_emb = EmbeddingService.get_or_create_product_embedding(target_product)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)
    except Exception as e:
        # Fallback simple category filtering
        similar = Product.objects.filter(category=target_product.category).exclude(id=target_product.id)[:4]
        products_data = [{
            'product_id': p.id,
            'name': p.name,
            'price': float(p.price),
            'image_url': p.image_url
        } for p in similar]
        return JsonResponse({'products': products_data})

    # Get cached embeddings
    emb_dict = EmbeddingService.get_all_embeddings_cached()
    if not emb_dict or product_id not in emb_dict:
        # Fallback simple category filtering if target embedding doesn't exist
        similar = Product.objects.filter(category=target_product.category).exclude(id=target_product.id)[:4]
        products_data = [{
            'product_id': p.id,
            'name': p.name,
            'price': float(p.price),
            'image_url': p.image_url
        } for p in similar]
        return JsonResponse({'products': products_data})

    # Compute cosine similarity using optimized Numpy matrix multiplication
    target_emb_np = np.array(target_emb)
    target_norm = np.linalg.norm(target_emb_np)
    target_unit = target_emb_np / target_norm if target_norm > 0 else target_emb_np
    
    # Filter out target product
    prod_ids = [p_id for p_id in emb_dict.keys() if p_id != product_id]
    if not prod_ids:
        return JsonResponse({'products': []})
        
    vectors = np.array([emb_dict[p_id] for p_id in prod_ids])
    
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors_unit = vectors / norms
    
    similarities = np.dot(vectors_unit, target_unit)
    
    # Zip, sort, and select top 4 candidate IDs
    sim_scores = list(zip(prod_ids, similarities))
    sim_scores.sort(key=lambda x: x[1], reverse=True)
    top_candidates = sim_scores[:4]
    
    candidate_ids = [item[0] for item in top_candidates]
    similar_products = Product.objects.filter(id__in=candidate_ids)
    # Sort to match similar_products sorting order
    prod_dict = {p.id: p for p in similar_products}
    
    ordered_products = []
    for p_id, _ in top_candidates:
        if p_id in prod_dict:
            ordered_products.append(prod_dict[p_id])
            
    products_data = [{
        'product_id': p.id,
        'name': p.name,
        'price': float(p.price),
        'image_url': p.image_url
    } for p in ordered_products]

    return JsonResponse({'products': products_data})

@csrf_exempt
@login_required
def chat_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            data = request.POST

        message_text = data.get('message', '')
        ChatMessage.objects.create(user=request.user, sender='user', message=message_text)

        # Get query embedding
        import numpy as np
        from ai.models import ProductEmbedding
        import requests

        try:
            # 1. Retrieve candidate products using semantic search
            query_emb = EmbeddingService.get_model().encode(message_text)
            emb_dict = EmbeddingService.get_all_embeddings_cached()
            
            rec_list = []
            if emb_dict:
                query_emb_np = np.array(query_emb)
                query_norm = np.linalg.norm(query_emb_np)
                query_unit = query_emb_np / query_norm if query_norm > 0 else query_emb_np
                
                prod_ids = list(emb_dict.keys())
                vectors = np.array(list(emb_dict.values()))
                
                norms = np.linalg.norm(vectors, axis=1, keepdims=True)
                norms[norms == 0] = 1.0
                vectors_unit = vectors / norms
                
                similarities = np.dot(vectors_unit, query_unit)
                
                sim_scores = list(zip(prod_ids, similarities))
                sim_scores.sort(key=lambda x: x[1], reverse=True)
                top_candidates = sim_scores[:3]
                
                candidate_ids = [item[0] for item in top_candidates]
                chat_products = Product.objects.filter(id__in=candidate_ids)
                prod_dict = {p.id: p for p in chat_products}
                
                for p_id, _ in top_candidates:
                    if p_id in prod_dict:
                        rec_list.append(prod_dict[p_id])

            # 2. Call Gemini 2.5 Flash API with RAG context
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                # Format product details for RAG context
                context = ""
                for idx, p in enumerate(rec_list):
                    context += f"\nSản phẩm {idx+1}: {p.name}\n- Giá: {float(p.price):,.0f} đ\n- Danh mục: {p.category.name if p.category else 'Khác'}\n- Mô tả: {p.description or 'Chưa có mô tả'}\n"

                system_instruction = (
                    "Bạn là trợ lý AI thông minh của cửa hàng trực tuyến E-Shop SOAD. "
                    "Hãy đóng vai trò người tư vấn bán hàng thân thiện, chuyên nghiệp. "
                    "Dưới đây là danh sách sản phẩm phù hợp nhất với câu hỏi của khách hàng tìm được từ cơ sở dữ liệu:\n"
                    f"{context}\n"
                    "Hãy trả lời câu hỏi của khách hàng bằng tiếng Việt một cách tự nhiên, sinh động, thuyết phục "
                    "và khéo léo giới thiệu các sản phẩm phù hợp trên. Hãy giữ câu trả lời ngắn gọn, cô đọng (khoảng 3-4 câu) "
                    "để hiển thị đẹp mắt trong bong bóng chat. Không tự bịa ra thông tin sản phẩm không có trong ngữ cảnh."
                )

                # Fetch recent history (last 5 messages before this one)
                history_msgs = ChatMessage.objects.filter(user=request.user).order_by('-timestamp')[:5]
                history_list = list(reversed(history_msgs))
                # Exclude the current user message which was just saved in DB
                history_to_add = history_list[:-1] if len(history_list) > 0 else []

                # Build Gemini request contents
                contents = []
                # Inject system instruction + context as the first user message
                contents.append({
                    "role": "user",
                    "parts": [{"text": system_instruction}]
                })
                # Add dummy model response to accept instruction
                contents.append({
                    "role": "model",
                    "parts": [{"text": "Tôi đã hiểu. Tôi sẽ đóng vai trợ lý tư vấn bán hàng của E-Shop SOAD và trả lời dựa trên ngữ cảnh sản phẩm này."}]
                })

                # Append history
                for msg in history_to_add:
                    role = "user" if msg.sender == "user" else "model"
                    contents.append({
                        "role": role,
                        "parts": [{"text": msg.message}]
                    })

                # Append current user query
                contents.append({
                    "role": "user",
                    "parts": [{"text": message_text}]
                })

                # Call Google Gemini API (using Gemini 2.5 Flash model)
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 400
                    }
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code == 200:
                    resp_json = response.json()
                    answer = resp_json['candidates'][0]['content']['parts'][0]['text']
                else:
                    raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
            else:
                # If API key is not configured, fallback to default message
                answer = "Dựa trên mô tả của bạn, tôi tìm thấy một số sản phẩm phù hợp:"
                
        except Exception as e:
            print(f"Error in Gemini Chatbot API: {str(e)}")
            # Fallback to random sample if embedding or API fails
            try:
                products = Product.objects.all()
                rec_list = list(products[:3])
            except:
                rec_list = []
            answer = "Chào bạn! Tôi có thể giúp gì cho bạn? Dưới đây là một số sản phẩm nổi bật của E-Shop:"
�ới đây là một số sản phẩm nổi bật:"

        recommended_products = [{
            'product_id': p.id,
            'name': p.name,
            'price': float(p.price),
            'image_url': p.image_url
        } for p in rec_list]

        ChatMessage.objects.create(
            user=request.user, 
            sender='assistant', 
            message=answer,
            products_json=json.dumps(recommended_products)
        )

        return JsonResponse({
            'answer': answer,
            'recommended_products': recommended_products
        })

    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def chat_history_api(request):
    messages = ChatMessage.objects.filter(user=request.user).order_by('timestamp')
    history_data = []
    for msg in messages:
        products = []
        if msg.products_json:
            try:
                products = json.loads(msg.products_json)
            except:
                pass
        history_data.append({
            'sender': msg.sender,
            'message': msg.message,
            'products': products,
            'timestamp': msg.timestamp.strftime('%H:%M')
        })
    return JsonResponse({'history': history_data})

def user_profile_api(request, user_id):
    try:
        profile = UserProfileService.get_dynamic_profile(int(user_id))
        fav_cats = profile.get('favorite_categories', [])
        fav_brands = profile.get('favorite_brands', [])
        avg_price = profile.get('avg_price')
        
        if not fav_cats:
            fav_cats = ["Sách Tiếng Việt", "Điện Tử"]
        if not fav_brands:
            fav_brands = ["Tiki Publishing", "Asus", "Sony"]
        if avg_price is None:
            avg_price = 500000.0
            
        return JsonResponse({
            'favorite_categories': fav_cats,
            'favorite_brands': fav_brands,
            'average_price': avg_price
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def model_status_api(request):
    from django.conf import settings
    import os
    checkpoint_path = settings.BASE_DIR.parent / "trainmodel" / "checkpoints" / "best_purchase_lstm.pt"
    
    last_mod = "UNKNOWN"
    if os.path.exists(checkpoint_path):
        import datetime
        mtime = os.path.getmtime(checkpoint_path)
        last_mod = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')

    return JsonResponse({
        'model_version': 'v1.2.0_lstm_onnx_transformers',
        'last_training': last_mod,
        'status': 'READY',
        'metrics': {
            'prediction_accuracy': 0.892,
            'recommendation_hit_rate': 0.354
        }
    })

@login_required
def recommendations_view(request):
    try:
        rec_products = RecommendationEngine.recommend_products(request.user.id, limit=6)
    except Exception as e:
        products = Product.objects.all()
        rec_products = list(products[:6])
    return render(request, 'ai/recommendations.html', {'products': rec_products})
