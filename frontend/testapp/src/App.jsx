import AiAssistant from './components/AiAssistant';

const testPatient = {
  name:          'Fatima Ben Ali',
  age:           74,
  current_stage: 0,
};

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0ebe3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <AiAssistant patient={testPatient} userRole="caregiver" />
    </div>
  );
}