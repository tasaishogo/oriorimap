import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export type LegendCardProps = {
  title?: string;
  className?: string;
  children?: ReactNode;
};

export function LegendCard({ title = '凡例', className, children }: LegendCardProps) {
  return (
    <Card data-testid="legend-card" className={className}>
      <CardHeader>
        <CardTitle className="font-display">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children ?? (
          <p className="text-sm text-muted-foreground">
            今後、表示中の地図・重ね合わせ地図の凡例をここに表示します。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
