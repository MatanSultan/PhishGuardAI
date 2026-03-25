import { z } from 'zod'

import { ORGANIZATION_TYPES, SUPPORTED_LOCALES } from '@/lib/constants'

const normalizedEmail = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase())

export const signInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8),
  next: z.string().optional(),
})

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    organization: z.string().trim().max(120).optional().or(z.literal('')),
    organizationType: z.enum(ORGANIZATION_TYPES).default('other'),
    organizationIndustry: z.string().trim().max(120).optional().or(z.literal('')),
    email: normalizedEmail,
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
    preferredLanguage: z.enum(SUPPORTED_LOCALES).default('he'),
    next: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const updateLanguageSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
