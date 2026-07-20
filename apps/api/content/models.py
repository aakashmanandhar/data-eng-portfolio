from django.db import models


class CaseStudy(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    summary = models.CharField(max_length=300, help_text="Short teaser shown on the cards")
    problem = models.TextField(help_text="What problem was being solved")
    architecture = models.TextField(help_text="How it was built")
    outcome = models.TextField(help_text="Result / what you'd do differently")
    tech_stack = models.CharField(max_length=300, help_text="Comma-separated, e.g. dbt, Airflow, Terraform")
    github_url = models.URLField(blank=True, help_text="GitHub repo URL to import metadata/README from")
    readme_content = models.TextField(blank=True, help_text="Auto-fetched from GitHub — raw README, not editable here")
    pdf_document = models.FileField(upload_to='case_study_pdfs/', blank=True, null=True, help_text="Full case study write-up as a PDF")
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
class BlogPost(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    excerpt = models.CharField(max_length=300, help_text="Short teaser shown on the cards")
    body = models.TextField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
class ADR(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    context = models.TextField(help_text="What situation led to this decision")
    decision = models.TextField(help_text="What was decided")
    consequences = models.TextField(help_text="Trade-offs and results")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "ADR"
        verbose_name_plural = "ADRs"

    def __str__(self):
        return self.title
    
class ProfileStatus(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('offline', 'Offline'),
        ('dnd', 'Do Not Disturb'),
    ]

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    now_building = models.CharField(max_length=300, help_text="Shown in the 'Now building' banner on the homepage")
    resume_pdf = models.FileField(upload_to='resume/', blank=True, null=True, help_text="Your current CV/resume as a PDF")
    profile_photo = models.FileField(upload_to='profile/', blank=True, null=True, help_text="Your profile photo (shown in the hero avatar circle)")
    headline_main = models.CharField(max_length=300, help_text="Full hero headline text")    
    subtext = models.TextField(blank=True, help_text="Paragraph shown below the hero headline")
    about_text = models.TextField(blank=True, help_text="Shown in the About section on the homepage")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Profile status"

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton — always one row
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # prevent deletion — there should always be exactly one row

    def __str__(self):
        return f"Status: {self.get_status_display()}"
    
class ContactMessage(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.created_at.strftime('%Y-%m-%d')}"