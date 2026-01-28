# backend/users/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # keep default fields (username, email, first_name, last_name, etc.)
    full_name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.username

class SkillCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.name

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(SkillCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='skills')
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name

class Profile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    contact = models.CharField(max_length=100, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    skills = models.ManyToManyField(Skill, blank=True, related_name='profiles')

    def __str__(self):
        return f"{self.user.username} profile"