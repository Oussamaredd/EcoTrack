import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BrandLogo from '../components/branding/BrandLogo';
import TicketList from '../pages/TicketList';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});


describe('Ticket Components', () => {
  test('TicketList shows loading state', () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <TicketList />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
  });

  test('BrandLogo uses width-based responsive image candidates', () => {
    render(<BrandLogo imageSizes="28px" />);

    const logo = screen.getByAltText('EcoTrack logo');
    expect(logo).toHaveAttribute(
      'srcset',
      '/branding/ecotrack-logo-96.png 96w, /branding/ecotrack-logo-192.png 192w',
    );
    expect(logo).toHaveAttribute('sizes', '28px');
  });
});
