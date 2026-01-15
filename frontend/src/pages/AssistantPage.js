import React from 'react';
import { Container } from '@mui/material';
import ChatBox from '../components/Assistant/ChatBox';

const AssistantPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <ChatBox initialContext={{ page: 'assistant' }} />
    </Container>
  );
};

export default AssistantPage;
