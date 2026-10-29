/** Palabras de fechas: meses, días y expresiones relativas. Los números (horas, días) no se traducen aquí. */
export const dates = {
  months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  /** Empiezan en domingo, como `Date.getDay()`. */
  weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  weekdaysMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  today: 'Hoy',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  /** «22 de julio de 2026». */
  longDate: '{day} de {month} de {year}',
  /** «12 ago». */
  dayMonthShort: '{day} {month}',
  /** «T3»: trimestre. */
  quarterShort: 'T{quarter}',
  /** «12 ago 2026». */
  dayMonthYearShort: '{day} {month} {year}',
  /** «22 de julio». */
  dayMonth: '{day} de {month}',
  /** «julio de 2026». */
  monthYear: '{month} de {year}',
  /** «miércoles, 22 de julio». */
  weekdayDayMonth: '{weekday}, {day} de {month}',
  /** «miércoles, 22 de julio de 2026». */
  weekdayLongDate: '{weekday}, {day} de {month} de {year}',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  relative: {
    justNow: 'hace un momento',
    minutesAgo: 'hace {count} min',
    hoursAgo: 'hace {count} h',
    yesterday: 'ayer',
    daysAgo: { one: 'hace # día', other: 'hace # días' },
    future: 'en el futuro',
  },
  units: {
    days: { one: 'día', other: 'días' },
    hours: { one: 'hora', other: 'horas' },
    minutes: { one: 'minuto', other: 'minutos' },
    seconds: { one: 'segundo', other: 'segundos' },
    daysShort: 'd',
    hoursShort: 'h',
    minutesShort: 'min',
    secondsShort: 's',
  },
  presets: {
    today: 'Hoy',
    yesterday: 'Ayer',
    last7: 'Últimos 7 días',
    last30: 'Últimos 30 días',
    thisMonth: 'Este mes',
    lastMonth: 'Mes pasado',
    thisQuarter: 'Este trimestre',
    thisYear: 'Este año',
  },
};
