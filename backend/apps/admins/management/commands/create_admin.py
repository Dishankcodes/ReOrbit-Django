from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.admins.models import Admins

class Command(BaseCommand):
    help='Create a ReOrbit admin account.'
    def add_arguments(self,parser):
        parser.add_argument('--name',required=True)
        parser.add_argument('--email',required=True)
        parser.add_argument('--password',required=True)
        parser.add_argument('--permission-level',choices=['Admin','Super_Admin'],default='Admin')
    def handle(self,*args,**opts):
        email=opts['email'].strip().lower()
        if Admins.objects.filter(email__iexact=email).exists(): raise CommandError('Admin email already exists.')
        a=Admins(full_name=opts['name'].strip(),email=email,permission_level=opts['permission_level'],activated_at=timezone.now())
        a.set_password(opts['password']); a.save()
        self.stdout.write(self.style.SUCCESS(f'Admin created: {email}'))
