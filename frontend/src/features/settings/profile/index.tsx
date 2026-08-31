import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { currentUserQueryOptions } from '@/features/auth/data/current-user-api'
import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  const currentUserQuery = useQuery(currentUserQueryOptions())

  return (
    <ContentSection
      title='Profile'
      desc='Update the name and email associated with your account.'
    >
      {currentUserQuery.isPending ? (
        <div className='space-y-6' aria-label='Loading profile'>
          <Skeleton className='h-18 w-full' />
          <Skeleton className='h-18 w-full' />
          <Skeleton className='h-9 w-32' />
        </div>
      ) : currentUserQuery.isError ? (
        <div className='space-y-3 rounded-md border border-destructive/40 p-4'>
          <p className='text-sm text-destructive'>
            Unable to load your profile.
          </p>
          <Button
            type='button'
            variant='outline'
            onClick={() => void currentUserQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <ProfileForm user={currentUserQuery.data} />
      )}
    </ContentSection>
  )
}
