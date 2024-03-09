const uuidv4 = (await import('../node_modules/uuid/dist/esm-browser/v4.js')).default;
class Contact {
    id;
    name;
    surname;
    company;
    phone;
    constructor(id, name, surname, company, phone) {
        this.id = id;
        this.name = name;
        this.surname = surname;
        this.company = company;
        this.phone = phone;
    }
    static idGenerator() {
        return uuidv4();
    }
}
class ContactManager {
    get contactsByLetter() {
        return this._contactsByLetter;
    }
    get contacts() {
        return this._contacts;
    }
    _contacts;
    _contactsByLetter;
    constructor() {
        this._contacts = new Map();
        this._contactsByLetter = new Map();
    }
    addContact(contact) {
        if (!contact.id) {
            contact.id = Contact.idGenerator();
        }
        this._contacts.set(contact.id, contact);
        this.updateContactsByLetterCache(contact, 'add');
        this.saveContactsToLocalStorage();
    }
    deleteContact(contactId) {
        const contact = this._contacts.get(contactId);
        if (contact) {
            this._contacts.delete(contactId);
            this.updateContactsByLetterCache(contact, 'delete');
            this.saveContactsToLocalStorage();
        }
    }
    clearContactList() {
        localStorage.removeItem("contacts");
        this._contacts.clear();
        this._contactsByLetter.clear();
    }
    getContactById(contactId) {
        return this._contacts.get(contactId);
    }
    updateContactsByLetterCache(contact, action) {
        const firstLetter = contact.name[0].toUpperCase();
        let contacts = this._contactsByLetter.get(firstLetter) || [];
        if (action === 'add') {
            contacts.push(contact);
        }
        else if (action === 'delete') {
            contacts = contacts.filter(c => c.id !== contact.id);
        }
        this._contactsByLetter.set(firstLetter, contacts);
    }
    getContactsByLetter(letter) {
        return this._contactsByLetter.get(letter.toUpperCase()) || [];
    }
    saveContactsToLocalStorage() {
        localStorage.setItem("contacts", JSON.stringify(Array.from(this._contacts.entries())));
    }
    loadContactsFromLocalStorage() {
        const loadedContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
        this._contacts.clear();
        this._contactsByLetter.clear();
        loadedContacts.forEach(([key, value]) => {
            this._contacts.set(key, value);
            this.updateContactsByLetterCache(value, 'add');
        });
    }
    searchContacts() {
        const input = document.getElementById("searchInput");
        if (input) {
            const uppercasedValue = input.value.toUpperCase();
            const contacts = Array.from(this.contacts.values());
            return contacts.filter((contact) => contact.name.toUpperCase().includes(uppercasedValue) || contact.surname.toUpperCase().includes(uppercasedValue));
        }
        return [];
    }
}
class ContactView {
    contactManager;
    constructor(contactManager) {
        this.contactManager = contactManager;
    }
    displayContacts(contacts, containerId = 'contacts') {
        const contactsContainer = document.getElementById(containerId);
        if (contactsContainer !== null) {
            contactsContainer.innerHTML = '';
            contacts.forEach((contact) => {
                const contactTile = document.createElement('div');
                contactTile.className = "contact-tile";
                contactTile.setAttribute('data-role', 'tile');
                contactTile.setAttribute('data-size', 'wide');
                const nameElement = document.createElement('div');
                nameElement.textContent = `Name: ${contact.name} ${contact.surname}`;
                contactTile.appendChild(nameElement);
                const phoneElement = document.createElement('div');
                phoneElement.textContent = `Phone number: ${contact.phone}`;
                contactTile.appendChild(phoneElement);
                const companyElement = document.createElement('div');
                companyElement.textContent = `Company: ${contact.company}`;
                contactTile.appendChild(companyElement);
                contactTile.addEventListener("click", () => this.openEditContactDialog(contact));
                contactsContainer.appendChild(contactTile);
            });
        }
        else {
            console.error(`Element with id "${containerId}" not found.`);
        }
        this.drawLetters();
    }
    drawLetters() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const alphabetContainer = document.getElementById('alphabet');
        if (!alphabetContainer) {
            console.error('Alphabet container not found');
            return;
        }
        alphabetContainer.innerHTML = "";
        alphabet.split('').forEach((letter) => {
            const letterElement = document.createElement('button');
            letterElement.className = 'button primary';
            if (this.hasContactsStartingWith(letter)) {
                letterElement.classList.add('has-contacts');
            }
            else {
                letterElement.classList.add('no-contacts');
            }
            letterElement.textContent = letter;
            letterElement.addEventListener('click', () => this.displayContactsByLetter(letter));
            alphabetContainer.appendChild(letterElement);
        });
    }
    hasContactsStartingWith(letter) {
        const contacts = Array.from(this.contactManager.contacts.values());
        return contacts.some((contact) => contact.name.toUpperCase().startsWith(letter));
    }
    openEditContactDialog(contact) {
        document.getElementById("deleteContactButton").hidden = false;
        document.getElementById('contactName').value = contact.name;
        document.getElementById('contactSurname').value = contact.surname;
        document.getElementById('contactCompany').value = contact.company;
        document.getElementById('contactPhone').value = contact.phone;
        document.getElementById('contactId').value = contact.id;
        Metro.dialog.open('#addContactDialog');
    }
    openAddContactDialog() {
        document.getElementById("deleteContactButton").hidden = true;
        document.getElementById('contactName').value = "";
        document.getElementById('contactSurname').value = "";
        document.getElementById('contactCompany').value = "";
        document.getElementById('contactPhone').value = "";
        document.getElementById('contactId').value = "";
        Metro.dialog.open('#addContactDialog');
    }
    readContactFromDialog() {
        return new Contact(document.getElementById('contactId').value, document.getElementById('contactName').value, document.getElementById('contactSurname').value, document.getElementById('contactCompany').value, document.getElementById('contactPhone').value);
    }
    displayContactsByLetter(letter) {
        const contacts = this.contactManager.getContactsByLetter(letter);
        this.displayContacts(contacts);
    }
    validateForm(form) {
        if (form.checkValidity()) {
            return true;
        }
        else {
            form.reportValidity();
            return false;
        }
    }
    closeDialogAndRefreshContacts() {
        this.displayContacts(Array.from(this.contactManager.contacts.values()));
        this.displayContacts(Array.from(this.contactManager.searchContacts()), "searchResults");
        Metro.dialog.close('#addContactDialog');
    }
}
class App {
    contactManager;
    contactView;
    constructor() {
        this.contactManager = new ContactManager();
        this.contactView = new ContactView(this.contactManager);
        this.setupEventListeners();
        this.initializeApp();
    }
    setupEventListeners() {
        this.setupAddContactButton();
        this.setupSearchContactButtonAndInput();
        this.setupResetContactFilterButton();
        this.setupClearContactListButton();
        this.setupFormButtons();
    }
    initializeApp() {
        this.contactManager.loadContactsFromLocalStorage();
        this.contactView.displayContacts(Array.from(this.contactManager.contacts.values()));
    }
    setupAddContactButton() {
        const button = document.getElementById("addContactButton");
        if (button) {
            button.addEventListener("click", this.contactView.openAddContactDialog);
        }
        else {
            console.log("addContactButton is null");
        }
    }
    setupSearchContactButtonAndInput() {
        const button = document.getElementById("searchContactButton");
        const input = document.getElementById("searchInput");
        if (button && input) {
            button.addEventListener("click", () => {
                Metro.dialog.open('#searchDialog');
                this.contactView.displayContacts(this.contactManager.searchContacts(), "searchResults");
            });
            input.addEventListener("input", () => {
                const filteredContacts = this.contactManager.searchContacts();
                this.contactView.displayContacts(filteredContacts, "searchResults");
            });
        }
        else {
            console.log("setupSearchContactButtonAndInput is null");
        }
    }
    setupResetContactFilterButton() {
        const button = document.getElementById("resetContactFilterButton");
        if (button) {
            button.addEventListener("click", () => this.contactView.displayContacts(Array.from(this.contactManager.contacts.values())));
        }
        else {
            console.log("resetContactFilterButton is null");
        }
    }
    setupClearContactListButton() {
        const button = document.getElementById("clearContactListButton");
        if (button) {
            button.addEventListener("click", () => {
                this.contactManager.clearContactList();
                this.contactView.displayContacts(Array.from(this.contactManager.contacts.values()));
            });
        }
        else {
            console.log("clearContactListButton is null");
        }
    }
    setupFormButtons() {
        const form = document.getElementById("contactForm");
        if (!form) {
            console.log("form is null");
            return;
        }
        this.setupSaveContactButton(form);
        this.setupDeleteContactButton();
    }
    setupSaveContactButton(form) {
        const button = document.getElementById("saveContactButton");
        if (button) {
            button.addEventListener("click", () => {
                if (this.contactView.validateForm(form)) {
                    this.contactManager.addContact(this.contactView.readContactFromDialog());
                    this.contactView.closeDialogAndRefreshContacts();
                }
            });
        }
        else {
            console.log("saveContactButton is null");
        }
    }
    setupDeleteContactButton() {
        const button = document.getElementById("deleteContactButton");
        if (button) {
            button.addEventListener("click", () => {
                this.contactManager.deleteContact(this.contactView.readContactFromDialog().id);
                this.contactView.closeDialogAndRefreshContacts();
            });
        }
        else {
            console.log("deleteContactButton is null");
        }
    }
}
const app = new App();
export {};
//# sourceMappingURL=app.js.map