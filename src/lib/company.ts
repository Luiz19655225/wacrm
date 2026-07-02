/**
 * Dados institucionais oficiais da WAVON.
 *
 * Fonte única de verdade para razão social, CNPJ, endereço e canais de contato.
 * Consumido pelo rodapé institucional e por toda a documentação jurídica
 * (Política de Privacidade, Termos de Uso, LGPD, Cookies, Exclusão de Dados),
 * garantindo consistência exigida pela verificação da Meta.
 */

export const COMPANY = {
  /** Razão social — empresário individual. */
  legalName: "Luiz Antônio de Lima Abrahao",
  /** Nome fantasia / marca. */
  tradeName: "WAVON",
  /** CNPJ formatado. */
  cnpj: "40.638.913/0001-52",

  address: {
    street: "Rua Engenheiro Foze Kalil Abrahao, 390",
    district: "Mercês",
    city: "Uberaba",
    state: "MG",
    zip: "38.060-010",
    /** Endereço completo em uma linha. */
    full: "Rua Engenheiro Foze Kalil Abrahao, 390 — Bairro Mercês, Uberaba/MG — CEP 38.060-010",
  },

  contact: {
    /** E-mail de suporte / canal principal ao cliente. */
    supportEmail: "suporte@wavon.com.br",
    /** E-mail para assuntos de privacidade e LGPD (Encarregado de Dados). */
    privacyEmail: "suporte@wavon.com.br",
    /** Telefone fixo formatado para exibição. */
    phone: "(34) 3025-2777",
    /** Telefone fixo apenas com dígitos (para tel:). */
    phoneRaw: "3430252777",
    /** Números de WhatsApp formatados para exibição. */
    whatsapp: ["(34) 99820-7529", "(34) 99822-3489"],
    /** Números de WhatsApp com DDI, apenas dígitos (para wa.me/). */
    whatsappRaw: ["5534998207529", "5534998223489"],
  },

  /** Horário de atendimento ao cliente. */
  businessHours: "Segunda a sexta, das 09:00 às 18:00",

  /** URL de produção. */
  siteUrl: "https://www.wavon.com.br",
} as const;
