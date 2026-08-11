import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

function renderLayout() {
  return render(
    <MemoryRouter>
      <AppLayout>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders a banner header', () => {
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the logo as a link to the top page with font-display styling', () => {
    renderLayout();
    const logo = screen.getByRole('link', { name: 'OriOriMap' });
    expect(logo).toHaveAttribute('href', '/');
    expect(logo).toHaveClass('font-display');
  });

  it('renders the main navigation links in order: 検索 → 地図をつくる → マイページ', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(3);

    expect(links[0]).toHaveTextContent('検索');
    expect(links[0]).toHaveAttribute('href', '/');

    expect(links[1]).toHaveTextContent('地図をつくる');
    expect(links[1]).toHaveAttribute('href', '/maps/new/edit');

    expect(links[2]).toHaveTextContent('マイページ');
    expect(links[2]).toHaveAttribute('href', '/mypage');
  });

  it('renders the children content', () => {
    renderLayout();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
