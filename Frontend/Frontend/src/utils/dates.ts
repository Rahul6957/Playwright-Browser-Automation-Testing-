export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return 'Not available'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return 'Not available'
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
