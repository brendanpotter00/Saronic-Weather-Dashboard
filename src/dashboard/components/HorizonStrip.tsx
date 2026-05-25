// The 10-day spine: the row of color-coded day columns Tara scans to pick a day. On a phone
// the row scrolls horizontally so each day's line stays tall enough to read rather than being
// crushed to a sliver.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ScoredDay } from '../../scoring/scoring';
import { DayColumn } from './DayColumn';
import { StatusLegend } from './StatusLegend';

interface HorizonStripProps {
  days: ScoredDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function HorizonStrip({ days, selectedDate, onSelect }: HorizonStripProps) {
  return (
    <Box component="section">
      {/* Heading on the left, the status key riding the same row on the right; on a narrow screen
          the key wraps to its own line beneath the heading. */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          columnGap: 2,
          rowGap: 1,
          mb: 1,
        }}
      >
        <Typography variant="overline" color="text.secondary" component="h2">
          10-Day Forecast
        </Typography>
        <StatusLegend />
      </Box>
      <Card>
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, overflowX: 'auto' }}>
            {days.map((day, index) => (
              <DayColumn
                key={day.date}
                day={day}
                isToday={index === 0}
                isSelected={day.date === selectedDate}
                onSelect={onSelect}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
