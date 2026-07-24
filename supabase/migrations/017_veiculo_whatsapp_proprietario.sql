-- Adiciona o WhatsApp do proprietário do veículo, para contato direto na página de Pagamentos.
alter table veiculos
  add column if not exists whatsapp_proprietario text;
