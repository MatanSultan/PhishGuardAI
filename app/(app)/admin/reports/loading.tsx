import { Skeleton } from '@/components/ui/skeleton'

export default function AdminReportsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <Skeleton className="h-80 w-full" />
    </div>
  )
}
