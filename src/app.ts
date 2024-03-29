
// @ts-ignore
const uuidv4 = (await import('../uuid/dist/esm-browser/v4.js')).default as any;

interface IContact {
    id: string;
    name: string;
    surname: string;
    company: string;
    phone: string;
}

class Contact implements IContact {
    constructor(
        public id: string,
        public name: string,
        public surname: string,
        public company: string,
        public phone: string
    ) {}

    static idGenerator() : string{
        return uuidv4();
    }
}

class ContactManager {
    get contactsByLetter(): Map<string, IContact[]> {
        return this._contactsByLetter;
    }
    get contacts(): Map<string, IContact> {
        return this._contacts;
    }

    private _contacts: Map<string, IContact>;
    private _contactsByLetter: Map<string, IContact[]>;

    public constructor() {
        this._contacts = new Map();
        this._contactsByLetter = new Map();
    }

    public addContact(contact: IContact): void {
        if (!contact.id) {
            contact.id = Contact.idGenerator();
        }
        this._contacts.set(contact.id, contact);
        this.updateContactsByLetterCache(contact, 'add');
        this.saveContactsToLocalStorage();
    }

    public deleteContact(contactId : string) : void {
        const contact = this._contacts.get(contactId);
        if (contact) {
            this._contacts.delete(contactId);
            this.updateContactsByLetterCache(contact, 'delete');
            this.saveContactsToLocalStorage();
        }
    }

    public clearContactList() : void {
        localStorage.removeItem("contacts");
        this._contacts.clear();
        this._contactsByLetter.clear();
    }

    public getContactById(contactId: string) : IContact | undefined {
        return this._contacts.get(contactId);
    }

    private updateContactsByLetterCache(contact: IContact, action: 'add' | 'delete'): void {
        const firstLetter = contact.name[0].toUpperCase();
        let contacts = this._contactsByLetter.get(firstLetter) || [];

        if (action === 'add') {
            contacts.push(contact);
        } else if (action === 'delete') {
            contacts = contacts.filter(c => c.id !== contact.id);
        }

        this._contactsByLetter.set(firstLetter, contacts);
    }

    public getContactsByLetter(letter: string): IContact[] {
        return this._contactsByLetter.get(letter.toUpperCase()) || [];
    }

    public saveContactsToLocalStorage() : void {
        localStorage.setItem("contacts", JSON.stringify(Array.from(this._contacts.entries())));
    }

    public loadContactsFromLocalStorage(): void {
        const loadedContacts: [string, IContact][] = JSON.parse(localStorage.getItem("contacts") || "[]");
        this._contacts.clear();
        this._contactsByLetter.clear();
        loadedContacts.forEach(([key, value]) => {
            this._contacts.set(key, value);
            this.updateContactsByLetterCache(value, 'add');
        });
    }

    public searchContacts(input : string) : IContact[] {
        if (input) {
            const uppercasedValue: string = input.toUpperCase();
            const contacts : IContact[] = Array.from(this.contacts.values());
            return contacts.filter((contact: IContact) =>
                contact.name.toUpperCase().includes(uppercasedValue) || contact.surname.toUpperCase().includes(uppercasedValue)
            );
        }
        return [];
    }
}

class ContactView {
    private contactManager: ContactManager;
    private contactNameInputField : HTMLInputElement;
    private contactSurnameInputField : HTMLInputElement;
    private contactCompanyInputField : HTMLInputElement;
    private contactPhoneInputField : HTMLInputElement
    private contactIdInputField : HTMLInputElement;
    private deleteContactButton : HTMLButtonElement;

    public constructor(contactManager: ContactManager) {
        this.contactManager = contactManager;
        this.deleteContactButton = document.getElementById("deleteContactButton") as HTMLButtonElement;
        this.contactNameInputField = document.getElementById('contactName') as HTMLInputElement;
        this.contactSurnameInputField = document.getElementById('contactSurname') as HTMLInputElement;
        this.contactCompanyInputField = document.getElementById('contactCompany') as HTMLInputElement;
        this.contactPhoneInputField = document.getElementById('contactPhone') as HTMLInputElement;
        this.contactIdInputField = document.getElementById('contactId') as HTMLInputElement;
    }

    public displayContacts(contacts: IContact[], containerId: string = 'contacts') : void {
        const contactsContainer: HTMLElement | null = document.getElementById(containerId);
        if (contactsContainer !== null) {
            contactsContainer.innerHTML = '';
            contacts.forEach((contact: IContact) : void => {
                const contactTile : HTMLDivElement = document.createElement('div');
                contactTile.className = "contact-tile";
                contactTile.setAttribute('data-role', 'tile');
                contactTile.setAttribute('data-size', 'wide');

                const nameElement : HTMLDivElement = document.createElement('div');
                nameElement.textContent = `Name: ${contact.name} ${contact.surname}`;
                contactTile.appendChild(nameElement);

                const phoneElement : HTMLDivElement = document.createElement('div');
                phoneElement.textContent = `Phone number: ${contact.phone}`;
                contactTile.appendChild(phoneElement);

                const companyElement : HTMLDivElement = document.createElement('div');
                companyElement.textContent = `Company: ${contact.company}`;
                contactTile.appendChild(companyElement);

                contactTile.addEventListener("click", ()=> this.openEditContactDialog(contact));

                contactsContainer.appendChild(contactTile);
            });
        } else {
            console.error(`Element with id "${containerId}" not found.`);
        }
        this.drawLetters();
    }

    public drawLetters() : void {
        const alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const alphabetContainer: HTMLElement | null = document.getElementById('alphabet');

        if (!alphabetContainer) {
            console.error('Alphabet container not found');
            return;
        }

        alphabetContainer.innerHTML = "";

        alphabet.split('').forEach((letter: string): void => {
            const letterElement: HTMLButtonElement = document.createElement('button');
            letterElement.className = 'button primary';

            if (this.hasContactsStartingWith(letter)) {
                letterElement.classList.add('has-contacts'); // Добавляем класс, если есть контакты
            } else {
                letterElement.classList.add('no-contacts'); // Добавляем класс, если контактов нет
            }

            letterElement.textContent = letter;
            letterElement.addEventListener('click', (): void => this.displayContactsByLetter(letter));
            alphabetContainer.appendChild(letterElement);
        });
    }

    private hasContactsStartingWith(letter: string): boolean {
        const contacts : IContact[] | undefined = this.contactManager.contactsByLetter.get(letter);
        return <boolean>(contacts && contacts.length > 0);
    }

    public openEditContactDialog(contact : IContact) :void {
        if (this.deleteContactButton) {
            this.deleteContactButton.hidden = false;
        } else {
            console.log("deleteContactButton is null");
        }
        this.contactNameInputField.value = contact.name;
        this.contactSurnameInputField.value = contact.surname;
        this.contactPhoneInputField.value = contact.company;
        this.contactCompanyInputField.value = contact.phone;
        this.contactIdInputField.value = contact.id;
        Metro.dialog.open('#addContactDialog');
    }

    public openAddContactDialog() : void {
        if (this.deleteContactButton) {
            this.deleteContactButton.hidden = true;
        } else {
            console.log("deleteContactButton is null");
        }
        this.contactNameInputField.value = "";
        this.contactSurnameInputField.value = "";
        this.contactPhoneInputField.value = "";
        this.contactCompanyInputField.value = "";
        this.contactIdInputField.value = "";
        Metro.dialog.open('#addContactDialog');
    }

    public readContactFromDialog() : IContact {
        return new Contact(
            this.contactIdInputField.value,
            this.contactNameInputField.value,
            this.contactSurnameInputField.value,
            this.contactCompanyInputField.value,
            this.contactPhoneInputField.value,
        );
    }

    public displayContactsByLetter(letter: string) : void {
        const contacts : IContact[] = this.contactManager.getContactsByLetter(letter);
        this.displayContacts(contacts);
    }

    public validateForm(form : HTMLFormElement) : boolean {
        if (form.checkValidity()) {
            return true;
        } else {
            form.reportValidity();
            return false;
        }
    }

    public closeDialogAndRefreshContacts(): void {
        this.displayContacts(Array.from(this.contactManager.contacts.values()));
        this.displayContacts(Array.from(this.contactManager.searchContacts("")), "searchResults");
        Metro.dialog.close('#addContactDialog');
    }
}

class App {
    private readonly contactManager: ContactManager;
    private readonly contactView: ContactView;

    constructor() {
        this.contactManager = new ContactManager();
        this.contactView = new ContactView(this.contactManager);
        this.setupEventListeners();
        this.initializeApp();
    }

    private setupEventListeners(): void {
        this.setupAddContactButton();
        this.setupSearchContactButtonAndInput();
        this.setupResetContactFilterButton();
        this.setupClearContactListButton();
        this.setupFormButtons();
    }

    private initializeApp(): void {
        this.contactManager.loadContactsFromLocalStorage();
        this.contactView.displayContacts(Array.from(this.contactManager.contacts.values()));
    }

    private setupAddContactButton(): void {
        const button: HTMLButtonElement | null = document.getElementById("addContactButton") as HTMLButtonElement | null;
        if (button) {
            // Использование стрелочной функции для сохранения контекста this
            button.addEventListener("click", () => this.contactView.openAddContactDialog());
        } else {
            console.log("addContactButton is null");
        }
    }

    private setupSearchContactButtonAndInput(): void {
        const button: HTMLButtonElement | null = document.getElementById("searchContactButton") as HTMLButtonElement | null;
        const input: HTMLInputElement | null = document.getElementById("searchInput") as HTMLInputElement | null;

        if (button && input) {
            button.addEventListener("click", () => {
                Metro.dialog.open('#searchDialog');
                this.contactView.displayContacts(this.contactManager.searchContacts(input.value), "searchResults");
            });

            input.addEventListener("input", () => {
                const filteredContacts = this.contactManager.searchContacts(input.value);
                this.contactView.displayContacts(filteredContacts, "searchResults");
            });
        } else {
            console.log("setupSearchContactButtonAndInput is null");
        }
    }

    private setupResetContactFilterButton() : void {
        const button : HTMLButtonElement | null = document.getElementById("resetContactFilterButton") as HTMLButtonElement | null;
        if (button) {
            button.addEventListener("click", ()=> this.contactView.displayContacts(Array.from(this.contactManager.contacts.values())));
        } else {
            console.log("resetContactFilterButton is null");
        }
    }

    private setupClearContactListButton() : void {
        const button : HTMLButtonElement | null = document.getElementById("clearContactListButton") as HTMLButtonElement | null;
        if (button) {
            button.addEventListener("click", () : void => {
                this.contactManager.clearContactList();
                this.contactView.displayContacts(Array.from(this.contactManager.contacts.values()));
            });
        } else {
            console.log("clearContactListButton is null");
        }
    }

    private setupFormButtons() : void {
        const form : HTMLFormElement | null = document.getElementById("contactForm") as HTMLFormElement | null;
        if (!form) {
            console.log("form is null");
            return;
        }

        this.setupSaveContactButton(form);
        this.setupDeleteContactButton();
    }

    private setupSaveContactButton(form: HTMLFormElement) : void {
        const button : HTMLButtonElement | null = document.getElementById("saveContactButton") as HTMLButtonElement | null;
        if (button) {
            button.addEventListener("click", () : void => {
                if (this.contactView.validateForm(form)) {
                    this.contactManager.addContact(this.contactView.readContactFromDialog());
                    this.contactView.closeDialogAndRefreshContacts();
                }
            });
        } else {
            console.log("saveContactButton is null");
        }
    }

    private setupDeleteContactButton() : void {
        const button : HTMLButtonElement | null = document.getElementById("deleteContactButton") as HTMLButtonElement | null;
        if (button) {
            button.addEventListener("click", () : void => {
                this.contactManager.deleteContact(this.contactView.readContactFromDialog().id);
                this.contactView.closeDialogAndRefreshContacts();
            });
        } else {
            console.log("deleteContactButton is null");
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', ()=> {const app = new App()});
} else {
    const app = new App();
}

export { };