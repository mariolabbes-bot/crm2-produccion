describe('Responsive Design Test', () => {
  const viewports = ['iphone-x', 'ipad-2', 'macbook-15'];

  beforeEach(() => {
    // The dev server runs on port 3002 according to package.json
    cy.visit('http://localhost:3002');
  });

  viewports.forEach(viewport => {
    it(`should display the login page correctly on ${viewport}`, () => {
      cy.viewport(viewport);
      cy.contains('h1', 'Iniciar Sesión').should('be.visible');
      cy.contains('button', 'Entrar').should('be.visible');
    });
  });
});
