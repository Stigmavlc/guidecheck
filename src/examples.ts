import type { DocumentFile, Configuration } from "./checker";
export const exampleDocuments: DocumentFile[] = [
  {
    path: "help.en.md",
    content: `# Booking desk guide

## 1. Prepare your account

Open the settings page and choose your job queue. Keep the customer record beside you.

## 2. Create a booking

Choose a time, check the address and save the appointment. Read [confirmation](#3-confirm-the-details) before finishing.

## 3. Confirm the details

Check the date and the contact number. For changes, see section 4.

## 4. Change a booking

Open the saved booking, select another available time and confirm the change.
`,
  },
  {
    path: "help.es.md",
    content: `# Guía de reservas

## 1. Preparar la cuenta

Abre la configuración y elige tu línea de trabajos. Ten a mano la ficha del cliente.

## 3. Confirmar los datos

Comprueba la fecha y el teléfono. Lee [cómo cambiar la reserva](#4-cambiar-una-reserva).

### 4. Cambiar una reserva

Abre la reserva guardada y selecciona otra hora disponible. Consulta el apartado 5 si necesitas ayuda.
`,
  },
];
export const exampleConfiguration: Configuration = {
  pairs: [
    {
      en: "help.en.md",
      es: "help.es.md",
      sections: [
        { en: "1. Prepare your account", es: "1. Preparar la cuenta" },
        { en: "2. Create a booking", es: "2. Crear una reserva" },
        { en: "3. Confirm the details", es: "3. Confirmar los datos" },
        { en: "4. Change a booking", es: "4. Cambiar una reserva" },
      ],
    },
  ],
  glossary: [{ language: "es", preferred: "cola de trabajos", avoid: ["línea de trabajos"] }],
};
