import {describe,expect,it} from "vitest";
import {MAX_BROKER_PROMPT,validateBrokerRequest,validatePicoRequest} from "../commerce/inference-broker.js";
describe("inference broker security",()=>{
 it("accepts bounded text-only work",()=>expect(validateBrokerRequest({prompt:"produce structured JSON",thinking:"high"}).thinking).toBe("high"));
 it("rejects malformed, oversized, and invalid thinking",()=>{expect(()=>validateBrokerRequest({prompt:"x",thinking:"high"})).toThrow("INVALID_PROMPT");expect(()=>validateBrokerRequest({prompt:"x".repeat(MAX_BROKER_PROMPT+1),thinking:"high"})).toThrow("INVALID_PROMPT");expect(()=>validateBrokerRequest({prompt:"produce structured JSON",thinking:"max"})).toThrow("INVALID_THINKING");});
 it("blocks delivery directives",()=>expect(()=>validateBrokerRequest({prompt:"please use --deliver now",thinking:"high"})).toThrow("DELIVERY_DIRECTIVE_BLOCKED"));
 it("validates bounded pico messages",()=>{const x=validatePicoRequest({messages:[{role:"user",content:"summarize this"}],maxTokens:99999,temperature:9});expect(x.maxTokens).toBe(2000);expect(x.temperature).toBe(1);expect(()=>validatePicoRequest({messages:[{role:"tool",content:"x"}]})).toThrow("INVALID_MESSAGE");});
});
