// barrel export for print slip: logo, financials, urdu helpers, thermal html, whatsapp message

export { LogoSVG } from './LogoSVG';
export { computeSlipFinancials, default as defaultComputeSlipFinancials } from './utils/slipFinancials';
export {
  applySlipUrduCorrections,
  translateSlipUnit,
  translateSlipCustomizations
} from './utils/slipUrduHelpers';
export { buildThermalPrintHtml, default as defaultBuildThermalPrintHtml } from './utils/thermalPrintHtmlBuilder';
export { buildSlipWhatsAppMessage, default as defaultBuildSlipWhatsAppMessage } from './utils/slipWhatsAppBuilder';
