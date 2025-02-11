import { DocumentSelectOptions, SuggestionSelectOptions, WordClassOptions } from '../../constants';

describe('Actions', () => {
  before(() => {
    cy.seedDatabase();
  });

  beforeEach(() => {
    cy.cleanLogin();
  });

  describe('Merge', () => {
    it.skip('merge a genericWord into a new word from the list view', () => {
      cy.selectCollection('genericWords');
      cy.getWordSuggestionDocumentDetails();
      cy.getActionsOption(SuggestionSelectOptions.EDIT).click();
      cy.findByTestId('word-input').then(([$word]) => {
        cy.findByTestId('word-class-input-container').click();
        cy.findAllByText(WordClassOptions.NNC.label).first().click();
        cy.get('button[type="submit"]').click();
        cy.selectCollection('genericWords');
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.get('@selectedWord').should('not.exist');
        cy.selectCollection('words');
        cy.searchForDocument($word.value);
        cy.findAllByText($word.value).first();
      });
    });

    it.skip('merge a genericWord into a new word from the show view', () => {
      cy.selectCollection('genericWords');
      cy.getWordSuggestionDocumentDetails();
      cy.getActionsOption(SuggestionSelectOptions.EDIT).click();
      cy.findByTestId('word-input').then(([$word]) => {
        cy.findByTestId('word-class-input-container').click();
        cy.findAllByText(WordClassOptions.NNC.label).first().click();
        cy.get('button[type="submit"]').click();
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.get('@selectedWord').should('not.exist');
        cy.selectCollection('words');
        cy.searchForDocument($word.value);
        cy.findAllByText($word.value).first();
      });
    });

    it('merge a wordSuggestion into a new word in the list view then redirect to words', () => {
      cy.createWordSuggestion();
      cy.selectCollection('wordSuggestions');
      cy.getWordSuggestionDocumentDetails();
      cy.get('@selectedWord').then(([$word]) => {
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.contains('Word Document Details');
        cy.findAllByText($word.innerText).first();
      });
    });

    it('merge a wordSuggestion into a new word in the show view the redirect to words', () => {
      cy.createWordSuggestion();
      cy.selectCollection('wordSuggestions');
      cy.getWordSuggestionDocumentDetails();
      cy.get('@selectedWord').then(([$word]) => {
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.contains('Word Document Details');
        cy.findAllByText($word.innerText).first();
      });
    });

    it('merge an exampleSuggestion into a new example in the list view the redirec to examples', () => {
      cy.createExampleSuggestion();
      cy.selectCollection('exampleSuggestions');
      cy.getExampleSuggestionDocumentDetails();
      cy.get('@selectedIgbo').then(([$igbo]) => {
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.findByText('Example Document Details');
        cy.findAllByText($igbo.innerText).first();
      });
    });

    it('merge an exampleSuggestion into a new example in the show view then redirect to examples', () => {
      cy.createExampleSuggestion();
      cy.selectCollection('exampleSuggestions');
      cy.getExampleSuggestionDocumentDetails();
      cy.get('@selectedIgbo').then(([$igbo]) => {
        cy.getActionsOption(SuggestionSelectOptions.VIEW).click();
        cy.getActionsOption(SuggestionSelectOptions.MERGE).click();
        cy.acceptConfirmation();
        cy.findByText('Example Document Details');
        cy.findAllByText($igbo.innerText).first();
      });
    });
  });

  describe('Combine', () => {
    it('combine one word into another word', () => {
      cy.selectCollection('words');
      cy.searchForDocument('');
      cy.getWordDetails(2);
      cy.getActionsOption(DocumentSelectOptions.COMBINE_WORD_INTO).click();
      cy.get('@selectedId').then(([id]) => {
        cy.findByTestId('primary-word-id-input').type(id.innerText);
        cy.acceptConfirmation();
      });
    });

    it('throw an error when no primary word id is provided', () => {
      cy.selectCollection('words');
      cy.searchForDocument('');
      cy.getActionsOption(DocumentSelectOptions.COMBINE_WORD_INTO).click();
      cy.acceptConfirmation();
      cy.wrap(true).as('skipErrorMessageCheck');
      cy.get('div').contains(/^Error:/, { timeout: 1000 });
    });
  });
});
