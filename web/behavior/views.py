import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import UserEvent
from ai.neo4j_service import Neo4jService

@csrf_exempt
@login_required
def log_event_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            data = request.POST

        product_id = data.get('product_id')
        action_type = data.get('action_type')
        session_id = data.get('session_id', 'default_session')

        if not product_id or not action_type:
            return JsonResponse({'error': 'product_id and action_type are required'}, status=400)

        event = UserEvent.objects.create(
            user_id=request.user.id,
            product_id=product_id,
            action_type=action_type,
            session_id=session_id
        )

        # Log interaction in Neo4j graph database
        try:
            Neo4jService.log_user_interaction(request.user.id, product_id, action_type)
        except Exception as e:
            print(f"Failed to log user interaction in Neo4j: {str(e)}")

        return JsonResponse({
            'message': 'Event logged successfully',
            'event_id': event.id
        }, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)
