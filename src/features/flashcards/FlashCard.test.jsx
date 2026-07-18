import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FlashCard } from './FlashCard';

const card = { title: 'Who is the RBI Governor?', detail: 'Shaktikanta Das.' };

describe('FlashCard', () => {
  it('renders both faces in the DOM — front title and back detail', () => {
    render(<FlashCard card={card} flipped={false} onFlip={() => {}} />);
    expect(screen.getByText(card.title)).toBeInTheDocument();
    expect(screen.getByText(card.detail)).toBeInTheDocument();
  });

  it('click calls onFlip', () => {
    const onFlip = vi.fn();
    render(<FlashCard card={card} flipped={false} onFlip={onFlip} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('applies the flipped class only when flipped is true', () => {
    const { container, rerender } = render(
      <FlashCard card={card} flipped={false} onFlip={() => {}} />,
    );
    expect(container.querySelector('.card-inner').className).not.toContain('flipped');

    rerender(<FlashCard card={card} flipped onFlip={() => {}} />);
    expect(container.querySelector('.card-inner').className).toContain('flipped');
  });
});
