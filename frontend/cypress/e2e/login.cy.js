describe('Login Functionality Test', () => {
  it('should log in a user and redirect to the homepage', () => {
    // Intercept the login API call and mock the response
    cy.intercept('POST', 'http://localhost:3001/api/users/login', {
      statusCode: 200,
      body: {
        token: 'fake-jwt-token'
      },
    }).as('loginRequest');

    // Visit the login page
    cy.visit('http://localhost:3002');

    // Fill out the form
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('password123');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Wait for the login request to be made
    cy.wait('@loginRequest');

    // Check if the redirection to the homepage was successful
    // The Login.js component navigates to '/' and reloads.
    // We will check if the URL is the base URL.
    cy.url().should('eq', 'http://localhost:3002/');
  });
});
