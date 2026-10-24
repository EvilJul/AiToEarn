'use client'

/** PublishingCalendar - 复用 FullCalendar，按企业时区定位发布日期。 */
import type { EnterprisePublishJob, EnterpriseRevision } from '@/api/enterprise/enterprise.types'
import allLocales from '@fullcalendar/core/locales-all'
import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'
import { useTransClient } from '@/app/i18n/client'
import styles from './PublishingCalendar.module.scss'

export default function PublishingCalendar({ jobs, revisions, timezone, onSelect }: { jobs: EnterprisePublishJob[], revisions: EnterpriseRevision[], timezone: string, onSelect: (id: string) => void }) {
  const { t, i18n } = useTransClient('enterprise')
  const formatter = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayKey = (date: Date) => {
    const parts = formatter.formatToParts(date)
    const part = (type: string) => parts.find(item => item.type === type)?.value || ''
    return `${part('year')}-${part('month')}-${part('day')}`
  }
  return (
    <div className={styles.calendar}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        timeZone="UTC"
        locales={allLocales}
        locale={i18n.language.toLowerCase()}
        headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
        buttonText={{ today: t('today') }}
        height="auto"
        now={() => dayKey(new Date())}
        initialDate={dayKey(new Date())}
        events={jobs.map((job) => {
          return { id: job.id, title: revisions.find(r => r.id === job.revisionId)?.title || t('approvedVersion'), start: dayKey(new Date(job.scheduledAt)), allDay: true }
        })}
        eventClick={event => onSelect(event.event.id)}
      />
    </div>
  )
}
