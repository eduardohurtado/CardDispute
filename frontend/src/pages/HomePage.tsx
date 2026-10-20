import { useAppDispatch } from '@/store';
import { showToast } from '@/store/slices/ui/uiSlice';

export default function HomePage() {
  const dispatch = useAppDispatch();

  return (
    <section>
      <h1>Card Dispute</h1>
      <p>Welcome to the card dispute portal.</p>
      <button type="button" onClick={() => dispatch(showToast('Welcome to Card Dispute!', 'success'))}>
        Show notification
      </button>
    </section>
  );
}
