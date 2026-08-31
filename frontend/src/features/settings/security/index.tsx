import { ContentSection } from '../components/content-section'
import { SecurityForm } from './security-form'

export function SettingsSecurity() {
  return (
    <ContentSection
      title='Security'
      desc='Change your password and protect access to your account.'
    >
      <SecurityForm />
    </ContentSection>
  )
}
