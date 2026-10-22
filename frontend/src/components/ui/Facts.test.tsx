import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Fact } from '@/components/ui/Fact';
import { Facts } from '@/components/ui/Facts';

describe('Fact', () => {
  it('renders the label as a term and the value as a definition', () => {
    render(
      <Facts>
        <Fact label="Merchant">Coffee Shop</Fact>
      </Facts>,
    );

    expect(screen.getByRole('term')).toHaveTextContent('Merchant');
    expect(screen.getByRole('definition')).toHaveTextContent('Coffee Shop');
  });
});
