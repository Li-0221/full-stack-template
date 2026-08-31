import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='Display'
      desc='Choose a layout that is saved in this browser.'
    >
      <DisplayForm />
    </ContentSection>
  )
}
