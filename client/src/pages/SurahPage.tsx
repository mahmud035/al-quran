import { EmptyState } from '@/components/ui/EmptyState';
import { useLastRead } from '@/features/progress/useLastRead';
import { useRecordReading } from '@/features/progress/useRecordReading';
import { SurahReader } from '@/features/surahs/SurahReader';
import { BookOpen } from 'lucide-react';
import { useParams } from 'react-router-dom';

export function SurahPage() {
  const { number } = useParams();
  const surahNumber = Number(number);

  // The page wires reading to progress: the reader detects dwell and reports where
  // the user stopped, the progress feature decides what to do with both. Keeps
  // features/surahs free of any progress import.
  const { recordAyah } = useRecordReading();
  const { save: saveLastRead } = useLastRead();

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Surah not found"
        message="Pick a surah between 1 and 114."
      />
    );
  }

  return (
    <SurahReader
      surahNumber={surahNumber}
      onAyahRead={recordAyah}
      onExit={(position) => void saveLastRead(position)}
    />
  );
}
