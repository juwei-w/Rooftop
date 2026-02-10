
import { TaskProvider } from './context/TaskContext';
import { TaskBoard } from './components/TaskBoard';

function App() {
  return (
    <TaskProvider>
      <TaskBoard />
    </TaskProvider>
  );
}

export default App;
