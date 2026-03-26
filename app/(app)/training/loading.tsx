import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function TrainingLoading() {
  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-5 w-full max-w-2xl" />
            </div>
            <Card className="w-full max-w-md border-primary/25 bg-primary/5 shadow-none">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
