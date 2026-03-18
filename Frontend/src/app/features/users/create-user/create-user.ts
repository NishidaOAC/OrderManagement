import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-user',
  imports: [ReactiveFormsModule],
  templateUrl: './create-user.html',
  styleUrl: './create-user.scss',
})
export class CreateUser {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['admin', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .register({
        fullName: this.form.value.fullName || '',
        email: this.form.value.email || '',
        password: this.form.value.password || '',
        role: this.form.value.role || 'admin',
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'User created successfully.';
          this.form.patchValue({
            fullName: '',
            email: '',
            password: '',
            role: 'admin',
          });
          this.form.markAsPristine();
          this.form.markAsUntouched();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to create user.';
        },
      });
  }
}
