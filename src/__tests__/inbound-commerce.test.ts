import {describe,expect,it} from "vitest";
import {classifyInboundCommerce} from "../commerce/inbound-commerce.js";

describe("inbound commerce classification",()=>{
  it.each([
    ["You have been hired","award",true],
    ["Interview invitation","interview",true],
    ["Additional requirements","scope_change",true],
    ["Payment released","payment_notice",true],
    ["New job alert","job_alert",false],
    ["Weekly newsletter — unsubscribe","noise",false],
    ["Question about your proposal","client_message",false],
  ])("classifies %s",(subject,kind,urgent)=>{
    expect(classifyInboundCommerce({subject})).toMatchObject({kind,urgent});
  });
});

