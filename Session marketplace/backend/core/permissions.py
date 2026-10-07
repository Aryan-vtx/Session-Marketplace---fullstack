from rest_framework.permissions import BasePermission
from core.models import User, Session


class IsCreator(BasePermission):
    message = "Only users with role 'creator' can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.ROLE_CREATOR
        )


class IsSessionOwner(BasePermission):
    message = "You do not have permission to modify or access this session."

    def has_permission(self, request, view):
        # Defer the actual ownership check to has_object_permission.
        # Require at minimum that the user is authenticated.
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        if isinstance(obj, Session):
            return obj.creator == request.user

        # For Booking objects, check if user owns the session
        if hasattr(obj, 'session'):
            return obj.session.creator == request.user

        return False
