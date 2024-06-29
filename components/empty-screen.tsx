import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Welcome to Home-e Assistant!
        </h1>
        <p className="leading-normal text-muted-foreground">
          Let us help you figure out the best way to upgrade your home,{' '}
          reduce your monthly bills, and make your home more sustainable.
        </p>
        <p className="leading-normal text-muted-foreground">
          This project is built with{' '}
          <ExternalLink href="https://www.eli.build/">
            Eli
          </ExternalLink>
          , and{' '}
          <ExternalLink href="https://openai.com/">
            OpenAI
          </ExternalLink>
        </p>
      </div>
    </div>
  )
}
