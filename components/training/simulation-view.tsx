'use client'

import type { ReactNode } from 'react'
import {
  BatteryCharging,
  Clock3,
  Link2,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Shield,
  Signal,
  Smartphone,
  Wifi,
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
        safeHint: 'תרגול פנימי בלבד',
        emailMode: 'סימולציית אימייל',
        chatMode: 'סימולציית צ׳אט',
        smsMode: 'סימולציית SMS',
        messageHint: 'קראו את ההודעה כפי שהייתה נראית בערוץ מוכר.',
        previewLink: 'תצוגת קישור',
        attachment: 'קובץ מצורף',
        inspectLabel: 'בדקו בזהירות',
        openPreview: 'תצוגה מקדימה',
        toLabel: 'אל',
        recipient: 'את/ה',
        todayLabel: 'היום',
        typingPlaceholder: 'לא ניתן להשיב מתוך התרגול',
        smsQuietLabel: 'הודעת טקסט',
        previewHint: 'בדקו את הכתובת המלאה לפני כל לחיצה.',
        attachmentHint: 'שימו לב לשם הקובץ ולסוג הקובץ.',
        domainLabel: 'דומיין',
      }
    : {
        trainingBadge: 'Safe training view',
        safeHint: 'Internal training only',
        emailMode: 'Email simulation',
        chatMode: 'Chat simulation',
        smsMode: 'SMS simulation',
        messageHint: 'Read the message as it would appear in a familiar channel.',
        previewLink: 'Link preview',
        attachment: 'Attachment',
        inspectLabel: 'Inspect carefully',
        openPreview: 'Preview only',
        toLabel: 'To',
        recipient: 'You',
        todayLabel: 'Today',
        typingPlaceholder: 'Reply is disabled in training',
        smsQuietLabel: 'Text message',
        previewHint: 'Review the full address before clicking.',
        attachmentHint: 'Review the file name and type.',
        domainLabel: 'Domain',
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

function getChannelTone(channel: Channel) {
  if (channel === 'email') {
    return {
      shell:
        'border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]',
      accent: 'bg-primary/10 text-primary',
      preview: 'border-primary/15 bg-primary/5 text-primary',
      attachment: 'border-slate-200/70 bg-white/85 dark:border-slate-800/70 dark:bg-slate-950/60',
    }
  }

  if (channel === 'sms') {
    return {
      shell:
        'border-sky-200/70 bg-[linear-gradient(180deg,rgba(244,249,255,0.98),rgba(232,241,252,0.96))] dark:border-sky-950/40 dark:bg-[linear-gradient(180deg,rgba(13,21,37,0.98),rgba(15,23,42,0.98))]',
      accent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      preview: 'border-sky-500/20 bg-sky-500/5 text-sky-700 dark:text-sky-300',
      attachment:
        'border-sky-200/70 bg-white/85 dark:border-sky-950/40 dark:bg-slate-950/60',
    }
  }

  return {
    shell:
      'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(241,251,246,0.98),rgba(233,247,240,0.95))] dark:border-emerald-950/40 dark:bg-[linear-gradient(180deg,rgba(10,28,22,0.98),rgba(15,23,42,0.98))]',
    accent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    preview: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    attachment:
      'border-emerald-200/70 bg-white/85 dark:border-emerald-950/40 dark:bg-slate-950/60',
  }
}

function getMessageDirection(language: string) {
  return language === 'he' ? 'rtl' : 'ltr'
}

function getChromeDirection(locale: Locale) {
  return locale === 'he' ? 'rtl' : 'ltr'
}

function formatSimulationTimestamp(locale: Locale) {
  const localeCode = locale === 'he' ? 'he-IL' : 'en-US'
  const time = new Intl.DateTimeFormat(localeCode, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

  return locale === 'he' ? `היום · ${time}` : `Today · ${time}`
}

function formatPhoneStatusTime(locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
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

function formatUrlHost(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function detectAttachmentLabel(content: string, title: string | null, locale: Locale) {
  const fileMatch = content.match(/([A-Za-z0-9._-]+\.(pdf|docx|xlsx|zip|jpg|png))/i)
  if (fileMatch?.[1]) {
    return fileMatch[1]
  }

  if (
    /(attachment|attached|invoice|receipt|notice|summary|form|document|attached file|מצורף|קובץ|חשבונית|טופס|מסמך|אישור)/i.test(
      content,
    )
  ) {
    if (title?.trim()) {
      return title.trim()
    }

    return locale === 'he' ? 'מסמך לעיון' : 'Attached document'
  }

  return null
}

function getContentParagraphs(content: string) {
  return normalizeSimulationContent(content)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function getFileTypeLabel(label: string) {
  const extension = label.split('.').pop()?.trim()
  return extension ? extension.toUpperCase() : 'FILE'
}

function DirectionSafeText({
  value,
  className,
  dir = 'auto',
  mono = false,
}: {
  value: string
  className?: string
  dir?: 'auto' | 'rtl' | 'ltr'
  mono?: boolean
}) {
  return (
    <span
      dir={dir}
      style={{ unicodeBidi: 'plaintext' }}
      className={cn(className, mono && 'font-mono tracking-[-0.01em]')}
    >
      {value}
    </span>
  )
}

function MessageParagraph({
  paragraph,
  className,
}: {
  paragraph: string
  className?: string
}) {
  return (
    <p
      className={cn('whitespace-pre-wrap break-words text-start', className)}
      dir="auto"
      style={{ unicodeBidi: 'plaintext' }}
    >
      {paragraph}
    </p>
  )
}

function SurfaceHeader({
  channel,
  title,
  copy,
}: {
  channel: Channel
  title: string
  copy: ReturnType<typeof getViewerCopy>
}) {
  const Icon = getChannelIcon(channel)
  const tone = getChannelTone(channel)

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm',
            tone.accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.messageHint}</p>
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <Badge variant="secondary" className="rounded-full px-2.5 py-1">
          <Shield className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
          {copy.trainingBadge}
        </Badge>
        <p className="text-[11px] text-muted-foreground">{copy.safeHint}</p>
      </div>
    </div>
  )
}

function ChannelPills({
  simulation,
  locale,
  organizationType,
  frameTitle,
}: {
  simulation: SimulationRecord
  locale: Locale
  organizationType?: OrganizationType | null
  frameTitle: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="rounded-full px-3 py-1">
        {frameTitle}
      </Badge>
      <Badge variant="outline" className="rounded-full px-3 py-1">
        {formatChannelLabel(simulation.channel, locale)}
      </Badge>
      <Badge variant="outline" className="rounded-full px-3 py-1">
        {formatCategoryLabel(simulation.category, locale, organizationType)}
      </Badge>
    </div>
  )
}

function LinkPreviewCard({
  url,
  copy,
  channel,
  compact = false,
}: {
  url: string
  copy: ReturnType<typeof getViewerCopy>
  channel: Channel
  compact?: boolean
}) {
  const tone = getChannelTone(channel)

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', tone.preview, compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/90 shadow-sm">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-current/80">
            <span>{copy.previewLink}</span>
            <span className="rounded-full border border-current/15 bg-background/80 px-2 py-0.5 normal-case tracking-normal">
              {copy.domainLabel}: <DirectionSafeText value={formatUrlHost(url)} dir="ltr" mono />
            </span>
          </div>
          <DirectionSafeText
            value={formatUrlPreview(url)}
            dir="ltr"
            mono
            className="mt-2 block break-all text-sm font-medium text-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">{copy.previewHint}</p>
        </div>
        <div className="hidden shrink-0 rounded-full border border-current/15 bg-background/90 px-3 py-1.5 text-xs font-medium text-current sm:inline-flex">
          {copy.openPreview}
        </div>
      </div>
    </div>
  )
}

function AttachmentPreviewCard({
  label,
  copy,
  channel,
  compact = false,
}: {
  label: string
  copy: ReturnType<typeof getViewerCopy>
  channel: Channel
  compact?: boolean
}) {
  const tone = getChannelTone(channel)

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', tone.attachment, compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
          <Paperclip className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {copy.attachment}
            </p>
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
              {getFileTypeLabel(label)}
            </Badge>
          </div>
          <DirectionSafeText value={label} className="mt-1.5 block break-all text-sm font-medium" />
          <p className="mt-2 text-xs text-muted-foreground">{copy.attachmentHint}</p>
        </div>
      </div>
    </div>
  )
}

function PhoneStatusBar({ locale }: { locale: Locale }) {
  const statusTime = formatPhoneStatusTime(locale)

  return (
    <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[11px] font-medium text-muted-foreground sm:px-5">
      <DirectionSafeText value={statusTime} />
      <div className="flex items-center gap-1.5">
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <BatteryCharging className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full border border-border/60 bg-background/85 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
        {label}
      </div>
    </div>
  )
}

function MessageBubble({
  children,
  compact = false,
  accent = false,
  isLast = false,
}: {
  children: ReactNode
  compact?: boolean
  accent?: boolean
  isLast?: boolean
}) {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'max-w-[88%] rounded-[22px] rounded-bl-md px-4 py-3 shadow-sm ring-1 ring-black/5 sm:max-w-[84%]',
          compact && 'max-w-[86%] px-3 py-2.5',
          accent
            ? 'bg-background/95 ring-current/10'
            : 'bg-background text-foreground dark:bg-slate-950/85',
          isLast && 'rounded-bl-[10px]',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function MessageStack({
  paragraphs,
  time,
  compact = false,
}: {
  paragraphs: string[]
  time: string
  compact?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {paragraphs.map((paragraph, index) => (
        <MessageBubble key={`${paragraph}-${index}`} compact={compact} isLast={index === paragraphs.length - 1}>
          <MessageParagraph
            paragraph={paragraph}
            className={cn(compact ? 'text-[14px] leading-6' : 'text-sm leading-6')}
          />
          {index === paragraphs.length - 1 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{time}</p>
          ) : null}
        </MessageBubble>
      ))}
    </div>
  )
}

function ChatFooter({
  copy,
  toneClassName,
}: {
  copy: ReturnType<typeof getViewerCopy>
  toneClassName: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <div className="rounded-full border border-border/60 bg-background/85 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
          {copy.inspectLabel}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-background/90 px-4 py-3 shadow-sm dark:bg-slate-950/80">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {copy.typingPlaceholder}
        </span>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', toneClassName)}>
          <Send className="h-4 w-4" />
        </div>
      </div>
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
  const tone = getChannelTone('email')

  return (
    <div
      dir={getChromeDirection(locale)}
      className={cn('rounded-[30px] border shadow-sm', tone.shell)}
    >
      <SurfaceHeader channel="email" title={copy.emailMode} copy={copy} />

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <ChannelPills
          simulation={simulation}
          locale={locale}
          organizationType={organizationType}
          frameTitle={frameTitle}
        />

        <div className="overflow-hidden rounded-[26px] border border-border/70 bg-background shadow-sm">
          <div className="border-b border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {subjectLabel}
                </p>
                <DirectionSafeText
                  value={
                    simulation.title ||
                    formatCategoryLabel(simulation.category, locale, organizationType)
                  }
                  className="mt-1 block text-balance text-lg font-semibold tracking-tight text-foreground sm:text-[1.35rem]"
                />
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <DirectionSafeText value={timestamp} />
              </div>
            </div>
          </div>

          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-primary">
                  {getInitials(sender.name || sender.address || 'Mail')}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="min-w-0">
                  <DirectionSafeText
                    value={
                      sender.name ||
                      sender.address ||
                      formatChannelLabel(simulation.channel, locale)
                    }
                    className="block break-words font-semibold text-foreground"
                  />
                  {sender.address && sender.address !== sender.name ? (
                    <DirectionSafeText
                      value={sender.address}
                      dir="ltr"
                      mono
                      className="mt-1 inline-flex max-w-full break-all rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground"
                    />
                  ) : null}
                </div>

                <div className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  <span className="text-muted-foreground">{fromLabel}</span>
                  <DirectionSafeText
                    value={
                      sender.name ||
                      sender.address ||
                      formatChannelLabel(simulation.channel, locale)
                    }
                    className="font-medium"
                  />
                  <span className="text-muted-foreground">{copy.toLabel}</span>
                  <span>{copy.recipient}</span>
                  <span className="text-muted-foreground">{dateLabel}</span>
                  <DirectionSafeText value={timestamp} className="font-medium" />
                </div>
              </div>
            </div>
          </div>

          <div
            className="space-y-4 px-4 py-5 text-[15px] leading-7 sm:px-5 sm:py-6"
            dir={getMessageDirection(simulation.language)}
          >
            {paragraphs.map((paragraph, index) => (
              <MessageParagraph
                key={`${paragraph}-${index}`}
                paragraph={paragraph}
                className="text-[15px] leading-7 text-foreground"
              />
            ))}

            {attachmentLabel ? (
              <AttachmentPreviewCard label={attachmentLabel} copy={copy} channel="email" />
            ) : null}

            {url ? <LinkPreviewCard url={url} copy={copy} channel="email" /> : null}
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
  const statusTime = formatPhoneStatusTime(locale)
  const messageDir = getMessageDirection(simulation.language)
  const tone = getChannelTone('whatsapp')

  return (
    <div
      dir={getChromeDirection(locale)}
      className={cn('mx-auto w-full max-w-[420px] rounded-[34px] border p-2.5 shadow-sm sm:p-3', tone.shell)}
    >
      <div className="overflow-hidden rounded-[28px] border border-emerald-200/40 bg-background shadow-sm dark:border-emerald-950/30">
        <PhoneStatusBar locale={locale} />
        <SurfaceHeader channel="whatsapp" title={copy.chatMode} copy={copy} />

        <div className="border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300">
                {getInitials(sender.name || sender.address || 'Chat')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DirectionSafeText
                value={
                  sender.name ||
                  sender.address ||
                  formatChannelLabel(simulation.channel, locale)
                }
                className="block break-words font-semibold"
              />
              {sender.address && sender.address !== sender.name ? (
                <DirectionSafeText
                  value={sender.address}
                  dir="ltr"
                  mono
                  className="mt-0.5 block truncate text-xs text-muted-foreground"
                />
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                    {frameTitle}
                  </Badge>
                  <span>{formatCategoryLabel(simulation.category, locale, organizationType)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-[linear-gradient(180deg,rgba(244,250,247,0.96),rgba(237,246,241,0.98))] px-3 py-4 dark:bg-[linear-gradient(180deg,rgba(7,18,14,0.98),rgba(12,22,18,0.98))] sm:px-4 sm:py-5">
          <DateSeparator label={timestamp} />

          <div className="space-y-2.5" dir={messageDir}>
            <MessageStack paragraphs={paragraphs} time={statusTime} />

            {attachmentLabel ? (
              <MessageBubble>
                <AttachmentPreviewCard
                  label={attachmentLabel}
                  copy={copy}
                  channel="whatsapp"
                  compact
                />
              </MessageBubble>
            ) : null}

            {url ? (
              <MessageBubble accent>
                <LinkPreviewCard url={url} copy={copy} channel="whatsapp" compact />
              </MessageBubble>
            ) : null}
          </div>

          <ChatFooter copy={copy} toneClassName={tone.accent} />
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
  const attachmentLabel = detectAttachmentLabel(content, simulation.title, locale)
  const timestamp = formatSimulationTimestamp(locale)
  const statusTime = formatPhoneStatusTime(locale)
  const messageDir = getMessageDirection(simulation.language)
  const tone = getChannelTone('sms')

  return (
    <div
      dir={getChromeDirection(locale)}
      className={cn('mx-auto w-full max-w-[360px] rounded-[34px] border p-2 shadow-sm sm:p-2.5', tone.shell)}
    >
      <div className="overflow-hidden rounded-[28px] border border-sky-200/50 bg-background shadow-sm dark:border-sky-950/30">
        <PhoneStatusBar locale={locale} />

        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DirectionSafeText
                value={
                  sender.name ||
                  sender.address ||
                  formatChannelLabel(simulation.channel, locale)
                }
                className="block break-words text-sm font-semibold"
              />
              {sender.address && sender.address !== sender.name ? (
                <DirectionSafeText
                  value={sender.address}
                  dir="ltr"
                  mono
                  className="mt-0.5 block truncate text-[11px] text-muted-foreground"
                />
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">{copy.smsQuietLabel}</p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px]">
              {frameTitle}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatCategoryLabel(simulation.category, locale, organizationType)}</span>
            <span aria-hidden="true">•</span>
            <DirectionSafeText value={timestamp} />
          </div>
        </div>

        <div className="space-y-3 bg-muted/20 px-3 py-4">
          <DateSeparator label={copy.todayLabel} />

          <div className="space-y-2" dir={messageDir}>
            <MessageStack paragraphs={paragraphs} time={statusTime} compact />

            {attachmentLabel ? (
              <MessageBubble compact>
                <AttachmentPreviewCard label={attachmentLabel} copy={copy} channel="sms" compact />
              </MessageBubble>
            ) : null}

            {url ? (
              <MessageBubble compact accent>
                <LinkPreviewCard url={url} copy={copy} channel="sms" compact />
              </MessageBubble>
            ) : null}
          </div>

          <div className="pt-1 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
