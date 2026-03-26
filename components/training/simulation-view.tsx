'use client'

import {
  Clock3,
  Link2,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Shield,
  Smartphone,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { OrganizationType } from '@/lib/constants'
import {
  formatCategoryLabel,
  formatChannelLabel,
  normalizeSimulationContent,
  splitSender,
} from '@/lib/presentation'
import { cn } from '@/lib/utils'

type Channel = 'email' | 'sms' | 'whatsapp'
type Locale = 'en' | 'he'

interface SimulationRecord {
  channel: Channel
  title: string | null
  sender: string | null
  content: string
  category: string
  language: string
  is_phishing: boolean
}

interface TrainingSimulationViewProps {
  simulation: SimulationRecord
  locale: Locale
  organizationType?: OrganizationType | null
  frameTitle: string
  fromLabel: string
  subjectLabel: string
  dateLabel: string
}

function getViewerCopy(locale: Locale) {
  return locale === 'he'
    ? {
        trainingBadge: 'סביבת תרגול בטוחה',
        emailMode: 'תצוגת אימייל',
        chatMode: 'תצוגת צ׳אט',
        smsMode: 'תצוגת SMS',
        messageHint: 'קראו את ההודעה כמו שהייתה נראית בערוץ מוכר.',
        previewLink: 'תצוגת קישור',
        attachment: 'קובץ מצורף',
        inspectLabel: 'בדיקה זהירה',
        toLabel: 'אל',
        recipient: 'המשתמש/ת',
      }
    : {
        trainingBadge: 'Safe training view',
        emailMode: 'Email simulation',
        chatMode: 'Chat simulation',
        smsMode: 'SMS simulation',
        messageHint: 'Read the message as it would appear in a familiar channel.',
        previewLink: 'Link preview',
        attachment: 'Attachment',
        inspectLabel: 'Inspect carefully',
        toLabel: 'To',
        recipient: 'You',
      }
}

function getChannelIcon(channel: Channel) {
  if (channel === 'email') {
    return Mail
  }

  if (channel === 'sms') {
    return Smartphone
  }

  return MessageSquare
}

function formatSimulationTimestamp(locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function getInitials(input: string) {
  const parts = input
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return '?'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function extractFirstUrl(content: string) {
  const match = content.match(/https?:\/\/[^\s]+/i)
  return match?.[0] ?? null
}

function formatUrlPreview(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`
  } catch {
    return url
  }
}

function detectAttachmentLabel(
  content: string,
  title: string | null,
  locale: Locale,
) {
  const fileMatch = content.match(/([A-Za-z0-9._-]+\.(pdf|docx|xlsx|zip))/i)
  if (fileMatch?.[1]) {
    return fileMatch[1]
  }

  if (/(attachment|attached|invoice|receipt|notice|summary|form|document|מצורף|קובץ|חשבונית|טופס|מסמך|אישור)/i.test(content)) {
    if (title?.trim()) {
      return title.trim()
    }

    return locale === 'he' ? 'קובץ לעיון' : 'Attached document'
  }

  return null
}

function getContentParagraphs(content: string) {
  return normalizeSimulationContent(content)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function SurfaceHeader({
  icon: Icon,
  title,
  subtitle,
  toneClassName,
}: {
  icon: ReturnType<typeof getChannelIcon>
  title: string
  subtitle: string
  toneClassName: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Badge variant="secondary" className="hidden sm:inline-flex">
        {subtitle}
      </Badge>
    </div>
  )
}

function EmailSimulationView({
  simulation,
  locale,
  organizationType,
  frameTitle,
  fromLabel,
  subjectLabel,
  dateLabel,
}: TrainingSimulationViewProps) {
  const copy = getViewerCopy(locale)
  const sender = splitSender(simulation.sender)
  const content = normalizeSimulationContent(simulation.content)
  const paragraphs = getContentParagraphs(content)
  const url = extractFirstUrl(content)
  const attachmentLabel = detectAttachmentLabel(content, simulation.title, locale)
  const timestamp = formatSimulationTimestamp(locale)

  return (
    <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] shadow-sm dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
      <SurfaceHeader
        icon={Mail}
        title={copy.emailMode}
        subtitle={copy.trainingBadge}
        toneClassName="bg-primary/10 text-primary"
      />

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{frameTitle}</Badge>
          <Badge variant="outline">{formatChannelLabel(simulation.channel, locale)}</Badge>
          <Badge variant="outline">
            {formatCategoryLabel(simulation.category, locale, organizationType)}
          </Badge>
        </div>

        <div className="rounded-3xl border border-border/70 bg-background/95 shadow-sm">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-primary">
                  {getInitials(sender.name || sender.address || 'Mail')}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {sender.name || sender.address || formatChannelLabel(simulation.channel, locale)}
                    </p>
                    {sender.address && sender.address !== sender.name ? (
                      <p className="truncate text-sm text-muted-foreground">{sender.address}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{timestamp}</span>
                  </div>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
                  <span className="text-muted-foreground">{fromLabel}</span>
                  <span className="font-medium">
                    {sender.name || sender.address || formatChannelLabel(simulation.channel, locale)}
                  </span>
                  <span className="text-muted-foreground">{copy.toLabel}</span>
                  <span>{copy.recipient}</span>
                  <span className="text-muted-foreground">{subjectLabel}</span>
                  <span className="font-semibold">
                    {simulation.title ||
                      formatCategoryLabel(simulation.category, locale, organizationType)}
                  </span>
                  <span className="text-muted-foreground">{dateLabel}</span>
                  <span>{timestamp}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="space-y-4 px-5 py-5 text-sm leading-7 sm:px-6"
            dir={simulation.language === 'he' ? 'rtl' : 'ltr'}
          >
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {attachmentLabel ? (
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {copy.attachment}
                    </p>
                    <p className="truncate font-medium">{attachmentLabel}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {url ? (
              <div className="rounded-2xl border border-border/70 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-primary">
                      {copy.previewLink}
                    </p>
                    <p className="truncate font-medium">{formatUrlPreview(url)}</p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-primary/20 bg-background px-4 py-2 text-sm font-medium text-primary">
                    <Link2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {copy.inspectLabel}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatSimulationView({
  simulation,
  locale,
  organizationType,
  frameTitle,
}: Omit<TrainingSimulationViewProps, 'fromLabel' | 'subjectLabel' | 'dateLabel'>) {
  const copy = getViewerCopy(locale)
  const sender = splitSender(simulation.sender)
  const content = normalizeSimulationContent(simulation.content)
  const paragraphs = getContentParagraphs(content)
  const url = extractFirstUrl(content)
  const attachmentLabel = detectAttachmentLabel(content, simulation.title, locale)
  const timestamp = formatSimulationTimestamp(locale)

  return (
    <div className="mx-auto max-w-md rounded-[34px] border border-emerald-200/60 bg-[linear-gradient(180deg,rgba(243,252,248,0.96),rgba(233,247,240,0.94))] p-3 shadow-sm dark:border-emerald-900/50 dark:bg-[linear-gradient(180deg,rgba(10,28,22,0.98),rgba(15,23,42,0.98))]">
      <div className="overflow-hidden rounded-[28px] border border-emerald-200/50 bg-background/95 shadow-sm dark:border-emerald-900/40">
        <SurfaceHeader
          icon={MessageSquare}
          title={copy.chatMode}
          subtitle={copy.trainingBadge}
          toneClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        />

        <div className="border-b border-border/60 px-5 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{frameTitle}</Badge>
            <Badge variant="outline">
              {formatCategoryLabel(simulation.category, locale, organizationType)}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 bg-[linear-gradient(180deg,rgba(245,250,247,0.92),rgba(239,246,243,0.98))] px-4 py-5 dark:bg-[linear-gradient(180deg,rgba(7,18,14,0.96),rgba(12,22,18,0.98))]">
          <div className="flex items-end gap-3">
            <Avatar className="h-10 w-10 rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300">
                {getInitials(sender.name || sender.address || 'Chat')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold">
                {sender.name || sender.address || formatChannelLabel(simulation.channel, locale)}
              </p>
              <p className="text-xs text-muted-foreground">{copy.messageHint}</p>
            </div>
          </div>

          <div className="space-y-2" dir={simulation.language === 'he' ? 'rtl' : 'ltr'}>
            {paragraphs.map((paragraph, index) => (
              <div key={`${paragraph}-${index}`} className="flex justify-start">
                <div className="max-w-[85%] rounded-[20px] rounded-bl-md bg-background px-4 py-3 text-sm leading-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900">
                  <p className="whitespace-pre-wrap break-words">{paragraph}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{timestamp}</p>
                </div>
              </div>
            ))}

            {attachmentLabel ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[20px] rounded-bl-md bg-background px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {copy.attachment}
                      </p>
                      <p className="truncate text-sm font-medium">{attachmentLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {url ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[20px] rounded-bl-md bg-emerald-500/10 px-4 py-3 text-sm shadow-sm ring-1 ring-emerald-500/15">
                  <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                    <Link2 className="h-4 w-4" />
                    <span>{copy.previewLink}</span>
                  </div>
                  <p className="mt-2 break-all text-muted-foreground">{formatUrlPreview(url)}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-border/60 bg-background/90 px-4 py-3 text-sm text-muted-foreground shadow-sm dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-3">
              <span>{copy.inspectLabel}</span>
              <Send className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SmsSimulationView({
  simulation,
  locale,
  organizationType,
  frameTitle,
}: Omit<TrainingSimulationViewProps, 'fromLabel' | 'subjectLabel' | 'dateLabel'>) {
  const copy = getViewerCopy(locale)
  const sender = splitSender(simulation.sender)
  const content = normalizeSimulationContent(simulation.content)
  const paragraphs = getContentParagraphs(content)
  const url = extractFirstUrl(content)
  const timestamp = formatSimulationTimestamp(locale)

  return (
    <div className="mx-auto max-w-sm rounded-[34px] border border-sky-200/60 bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(232,241,252,0.94))] p-3 shadow-sm dark:border-sky-900/40 dark:bg-[linear-gradient(180deg,rgba(13,21,37,0.98),rgba(15,23,42,0.98))]">
      <div className="overflow-hidden rounded-[28px] border border-sky-200/50 bg-background/95 shadow-sm dark:border-sky-900/40">
        <SurfaceHeader
          icon={Smartphone}
          title={copy.smsMode}
          subtitle={copy.trainingBadge}
          toneClassName="bg-sky-500/15 text-sky-700 dark:text-sky-300"
        />

        <div className="border-b border-border/60 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {sender.name || sender.address || formatChannelLabel(simulation.channel, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCategoryLabel(simulation.category, locale, organizationType)}
              </p>
            </div>
            <Badge variant="outline">{frameTitle}</Badge>
          </div>
        </div>

        <div className="space-y-3 bg-muted/20 px-4 py-5" dir={simulation.language === 'he' ? 'rtl' : 'ltr'}>
          {paragraphs.map((paragraph, index) => (
            <div key={`${paragraph}-${index}`} className="flex justify-start">
              <div className="max-w-[88%] rounded-[18px] rounded-bl-md bg-background px-4 py-3 text-sm leading-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900">
                <p className="whitespace-pre-wrap break-words">{paragraph}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{timestamp}</p>
              </div>
            </div>
          ))}

          {url ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-[18px] rounded-bl-md bg-sky-500/10 px-4 py-3 text-sm shadow-sm ring-1 ring-sky-500/15">
                <div className="flex items-center gap-2 font-medium text-sky-700 dark:text-sky-300">
                  <Link2 className="h-4 w-4" />
                  <span>{copy.previewLink}</span>
                </div>
                <p className="mt-2 break-all text-muted-foreground">{formatUrlPreview(url)}</p>
              </div>
            </div>
          ) : null}

          <div className="pt-2 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {copy.inspectLabel}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrainingSimulationView(props: TrainingSimulationViewProps) {
  if (props.simulation.channel === 'email') {
    return <EmailSimulationView {...props} />
  }

  if (props.simulation.channel === 'sms') {
    return <SmsSimulationView {...props} />
  }

  return <ChatSimulationView {...props} />
}
