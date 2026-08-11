import { render, screen } from '@testing-library/react';
import { LegendCard } from './LegendCard';

describe('LegendCard', () => {
  it('renders the root element with data-testid="legend-card"', () => {
    render(<LegendCard />);
    expect(screen.getByTestId('legend-card')).toBeInTheDocument();
  });

  it('shows the default title "凡例" when no title prop is given', () => {
    render(<LegendCard />);
    expect(screen.getByText('凡例')).toBeInTheDocument();
  });

  it('shows a custom title instead of the default when the title prop is given', () => {
    render(<LegendCard title="レイヤー" />);
    expect(screen.getByText('レイヤー')).toBeInTheDocument();
    expect(screen.queryByText('凡例')).not.toBeInTheDocument();
  });

  it('renders children inside the card', () => {
    render(
      <LegendCard>
        <div>凡例の内容</div>
      </LegendCard>,
    );
    expect(screen.getByText('凡例の内容')).toBeInTheDocument();
  });

  it('applies the className prop to the root element', () => {
    render(<LegendCard className="absolute bottom-4 right-4" />);
    expect(screen.getByTestId('legend-card')).toHaveClass('absolute', 'bottom-4', 'right-4');
  });
});

// 対応要件ID: なし（T009は骨格のみが対象。design §5.3 コンポーネント方針・§9 File Structure Plan）
// かさね色データの消費（複数レイヤー色分け）はT009の範囲外のため未検証
