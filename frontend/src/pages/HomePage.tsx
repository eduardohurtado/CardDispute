import { useAppDispatch } from '@/store';
import { showToast } from '@/store/slices/ui/uiSlice';

export default function HomePage() {
  const dispatch = useAppDispatch();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Card Dispute</h1>
      <p className="text-gray-600">Welcome to the card dispute portal.</p>
      <button
        type="button"
        className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => dispatch(showToast('Welcome to Card Dispute!', 'success'))}
      >
        Show notification
      </button>
    </section>
  );
}
