import { render, screen } from '@testing-library/react';
import App from './App';

test('대시보드 제목이 보인다', () => {
  render(<App />);
  expect(screen.getByText('나만의 대시보드')).toBeInTheDocument();
});
