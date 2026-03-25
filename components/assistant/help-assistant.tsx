'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, Send, Loader2, ShieldCheck, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { AssistantMode, AssistantRole } from '@/lib/assistant/context'
import { useLocale } from '@/lib/locale-context'

type Message = { from: 'user' | 'assistant'; text: string }

interface HelpAssistantProps {
  role: AssistantRole
  mode: AssistantMode
}

export function HelpAssistant({ role, mode }: HelpAssistantProps) {
  const { locale, dir } = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)

  const scopeLine =
    locale === 'he'
      ? 'עזרה מעשית בתוך PhishGuard AI: ניווט, דפים, כפתורים, דוחות ואיך להתקדם.'
      : 'Practical help inside PhishGuard AI: navigation, pages, buttons, reports, and next steps.'

  const placeholder =
    locale === 'he' ? 'שאל/י על הדף או הכפתור הזה…' : 'Ask about this page or button…'

  const defaultStarter = useMemo(() => {
    if (role === 'admin') {
      return locale === 'he'
        ? ['את מי צריך לרענן?', 'מה אומר Risk Score?', 'מה לעשות עכשיו?']
        : ['Who needs a refresher?', 'What does the Risk Score mean?', 'What should I do next?']
    }

    return locale === 'he'
      ? ['איך מתחילים אימון?', 'מה המשמעות של הציון שלי?', 'איך אני משתפר?']
      : ['How do I start training?', 'What does my score mean?', 'How do I improve?']
  }, [locale, role])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          from: 'assistant',
          text:
            locale === 'he'
              ? 'שלום! אפשר לשאול על הדף הזה, על כפתור מסוים או על הציון שאתם רואים.'
              : 'Hi! Ask about this page, a specific button, or the score you are seeing.',
        },
      ])
      setSuggestions(defaultStarter)
    }
  }, [open, messages.length, locale, defaultStarter])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isSending) return

    setMessages((prev) => [...prev, { from: 'user', text: content }])
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          page: pathname,
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('assistant_unavailable')
      }

      const data = (await response.json()) as { reply?: string; starterPrompts?: string[] }
      const reply =
        data.reply ||
        (locale === 'he'
          ? 'לא הצלחתי לענות כרגע. נסה שוב בעוד רגע.'
          : 'Unable to answer right now. Please try again.')

      setMessages((prev) => [...prev, { from: 'assistant', text: reply }])
      if (data.starterPrompts) {
        setSuggestions(data.starterPrompts)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: 'assistant',
          text:
            locale === 'he'
              ? 'אני כאן כדי לעזור בתוך PhishGuard AI. שאל על הדף, הציון או הפעולה הבאה ואכוון אותך מיד.'
              : 'I’m here to help inside PhishGuard AI. Ask about this page, your score, or the next action and I’ll guide you.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div dir={dir} className="fixed bottom-4 ltr:right-4 rtl:left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="lg" className="shadow-lg">
            <MessageCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {locale === 'he' ? 'עזרה' : 'Help'}
          </Button>
        </SheetTrigger>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {locale === 'he' ? 'עוזר בתוך המוצר' : 'In-product assistant'}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{scopeLine}</p>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-3">
            <ScrollArea className="h-[320px] rounded-lg border border-border bg-muted/30 p-3">
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.from}-${idx}`}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.from === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    {locale === 'he'
                      ? 'שאל/י על הדף הנוכחי, הציון, הדוח או כפתור לא ברור.'
                      : 'Ask about the current page, score, report, or an unclear button.'}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="border-dashed"
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending}
                >
                  <Sparkles className="h-3 w-3 ltr:mr-1 rtl:ml-1 text-primary" />
                  {prompt}
                </Button>
              ))}
            </div>

            <Separator />

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void sendMessage()
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isSending}
              />
              <Button type="submit" size="icon" disabled={isSending || !input.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
