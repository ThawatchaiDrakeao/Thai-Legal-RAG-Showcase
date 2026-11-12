import { StrictMode, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const LAW_CATEGORIES = [
  { id: "all", label: "ทั้งหมด", icon: "🌐" },
  { id: "criminal", label: "กฎหมายอาญา", icon: "⚖️" },
  { id: "civil", label: "แพ่งและพาณิชย์", icon: "📜" },
  { id: "finance", label: "การเงิน/ธุรกิจ (สมหมาย)", icon: "💼" },
  { id: "tax", label: "ภาษีอากร (สมศรี)", icon: "💰" }
];

const PRESET_QUERIES = [
  // --- อาญา (Criminal) ---
  {
    id: "theft",
    category: "criminal",
    tag: "ป.อ. ลักทรัพย์กลางคืน",
    section: "§335(1)",
    title: "ลักทรัพย์กลางคืน ม.335",
    question: "ลักทรัพย์ในเวลากลางคืนมีโทษอย่างไร",
    desc: "ตรวจสอบเหตุฉกรรจ์และอัตราโทษคดีลักทรัพย์ตามกฎหมายอาญา",
    instantResult: {
      answer: "การลักทรัพย์ในเวลากลางคืนเป็นความผิดตามประมวลกฎหมายอาญา มาตรา 335 (1) ซึ่งกฎหมายกำหนดให้เป็น \"เหตุฉกรรจ์\" ที่มีโทษหนักกว่าการลักทรัพย์ธรรมดา:\n\n⚖️ อัตราโทษ:\n- ระวางโทษจำคุกตั้งแต่ 1 ปี ถึง 5 ปี และปรับตั้งแต่ 20,000 บาท ถึง 100,000 บาท\n\n📌 เปรียบเทียบกับกรณีอื่น:\n- หากเป็นการลักทรัพย์ธรรมดา (ม.334) มีโทษจำคุกไม่เกิน 3 ปี และปรับไม่เกิน 60,000 บาท\n- หากเข้าเหตุฉกรรจ์ร่วมกันตั้งแต่ 2 อนุมาตราขึ้นไป (เช่น กลางคืน + ในเคหสถาน) โทษจะเพิ่มขึ้นเป็นจำคุก 1 ถึง 7 ปี และปรับ 20,000 ถึง 140,000 บาท ตามมาตรา 335 วรรคสอง",
      found_context: true,
      sources: [
        {
          source_file: "pythainlp_thai_law (ประมวลกฎหมายอาญา)",
          page_number: null,
          score: 0.912,
          text: "มาตรา ๓๓๕ ผู้ใดลักทรัพย์ (๑) ในเวลากลางคืน... ต้องระวางโทษจำคุกตั้งแต่หนึ่งปีถึงห้าปี และปรับตั้งแต่สองหมื่นบาทถึงหนึ่งแสนบาท"
        },
        {
          source_file: "pythainlp_thai_law (ประมวลกฎหมายอาญา)",
          page_number: null,
          score: 0.745,
          text: "มาตรา ๓๓๔ ผู้ใดเอาทรัพย์ของผู้อื่น หรือที่ผู้อื่นเป็นเจ้าของรวมอยู่ด้วยไปโดยทุจริต ผู้นั้นกระทำความผิดฐานลักทรัพย์ ต้องระวางโทษจำคุกไม่เกินสามปี และปรับไม่เกินหกหมื่นบาท"
        }
      ]
    }
  },
  {
    id: "defense",
    category: "criminal",
    tag: "ป.อ. ป้องกันตัว",
    section: "§68",
    title: "การป้องกันตัว ม.68",
    question: "การกระทำเพื่อป้องกันตัวโดยชอบด้วยกฎหมายคืออะไร",
    desc: "วิเคราะห์หลักยกเว้นความผิดตามประมวลกฎหมายอาญา มาตรา 68",
    instantResult: {
      answer: "ตามประมวลกฎหมายอาญา มาตรา 68 การป้องกันโดยชอบด้วยกฎหมายถือเป็น \"เหตุยกเว้นความผิด\" โดยมีสาระสำคัญดังนี้:\n\n🛡️ เงื่อนไข 4 ประการ:\n1. มีภยันตรายซึ่งเกิดจากการประทุษร้ายอันละเมิดต่อกฎหมาย\n2. เป็นภยันตรายที่ \"ใกล้จะถึง\" (ไม่สามารถหลีกเลี่ยงหรือขอความช่วยเหลือจากเจ้าหน้าที่ได้ทัน)\n3. ผู้กระทำจำต้องกระทำเพื่อป้องกันสิทธิของตนหรือของผู้อื่น\n4. ได้กระทำไป \"พอสมควรแก่เหตุ\"\n\n✅ ผลทางกฎหมาย:\nหากครบหลักเกณฑ์ทั้ง 4 ข้อ กฎหมายบัญญัติชัดเจนว่า \"การกระทำนั้นเป็นการป้องกันโดยชอบด้วยกฎหมาย ผู้นั้นไม่มีความผิด\" ส่งผลให้ไม่ต้องรับโทษทางอาญาและไม่มีความรับผิดทางแพ่งฐานละเมิด",
      found_context: true,
      sources: [
        {
          source_file: "pythainlp_thai_law (ประมวลกฎหมายอาญา)",
          page_number: null,
          score: 0.884,
          text: "มาตรา ๖๘ ผู้ใดจำต้องกระทำการใดเพื่อป้องกันสิทธิของตนหรือของผู้อื่นให้พ้นภยันตรายซึ่งเกิดจากการประทุษร้ายอันละเมิดต่อกฎหมาย และเป็นภยันตรายที่ใกล้จะถึง ถ้าได้กระทำพอสมควรแก่เหตุ การกระทำนั้นเป็นการป้องกันโดยชอบด้วยกฎหมาย ผู้นั้นไม่มีความผิด"
        }
      ]
    }
  },

  // --- แพ่งและพาณิชย์ (Civil) ---
  {
    id: "tort",
    category: "civil",
    tag: "ป.พ.พ. ละเมิด",
    section: "§420",
    title: "มาตรา 420 ละเมิด",
    question: "มาตรา 420 มีความรับผิดอย่างไร",
    desc: "สืบค้นหลักความรับผิดเพื่อละเมิดตามประมวลกฎหมายแพ่งและพาณิชย์",
    instantResult: {
      answer: "ตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 420 บัญญัติหลักความรับผิดเพื่อละเมิดไว้ว่า:\n\n\"ผู้ใดจงใจหรือประมาทเลินเล่อ ทำต่อบุคคลอื่นโดยผิดกฎหมายให้เขาเสียหายถึงแก่ชีวิตก็ดี แก่ร่างกายก็ดี แก่อนามัยก็ดี แก่เสรีภาพก็ดี แก่ทรัพย์สินหรือสิทธิอย่างหนึ่งอย่างใดก็ดี ท่านว่าผู้นั้นทำละเมิดจำต้องใช้ค่าสินไหมทดแทนเพื่อการนั้น\"\n\n✦ องค์ประกอบสำคัญ 5 ประการ:\n1. มีการกระทำ (รวมถึงการงดเว้นการกระทำที่ตนมีหน้าที่ต้องทำ)\n2. กระทำโดยจงใจ หรือประมาทเลินเล่อ\n3. การกระทำนั้นผิดกฎหมาย (ไม่มีอำนาจหรือข้ออ้างตามกฎหมาย)\n4. ก่อให้เกิดความเสียหายแก่สิทธิ ร่างกาย เสรีภาพ หรือทรัพย์สินของผู้อื่น\n5. ความเสียหายเป็นผลโดยตรงจากการกระทำนั้น\n\nเมื่อครบองค์ประกอบ ผู้กระทำละเมิดมีหน้าที่ตามกฎหมายที่ต้องชดใช้ค่าสินไหมทดแทนเพื่อเยียวยาความเสียหาย",
      found_context: true,
      sources: [
        {
          source_file: "civil_commercial_code_snapshot.pdf",
          page_number: 75,
          score: 1.0,
          text: "มาตรา ๔๒๐ ผู้ใดจงใจหรือประมาทเลินเล่อ ทำต่อบุคคลอื่นโดยผิดกฎหมายให้เขาเสียหายถึงแก่ชีวิตก็ดี แก่ร่างกายก็ดี แก่อนามัยก็ดี แก่เสรีภาพก็ดี แก่ทรัพย์สินหรือสิทธิอย่างหนึ่งอย่างใดก็ดี ท่านว่าผู้นั้นทำละเมิดจำต้องใช้ค่าสินไหมทดแทนเพื่อการนั้น"
        }
      ]
    }
  },
  {
    id: "collision",
    category: "civil",
    tag: "ม.288 (แพ่ง vs อาญา)",
    section: "§288",
    title: "มาตราชนกัน ม.288",
    question: "มาตรา 288 คืออะไร",
    desc: "ทดสอบกรณีเลขมาตราตรงกันในประมวลกฎหมายแพ่งฯ และอาญา",
    instantResult: {
      answer: "คำถามเกี่ยวกับ \"มาตรา 288\" ปรากฏอยู่ในประมวลกฎหมาย 2 ฉบับหลัก ซึ่งระบบค้นพบและสรุปสาระสำคัญของทั้ง 2 บริบทดังนี้ครับ:\n\n1. ⚖️ ประมวลกฎหมายอาญา มาตรา 288 (ความผิดต่อชีวิต):\n- \"ผู้ใดฆ่าผู้อื่น ต้องระวางโทษประหารชีวิต จำคุกตลอดชีวิต หรือจำคุกตั้งแต่สิบห้าปีถึงยี่สิบปี\"\n- เป็นบทบัญญัติพื้นฐานของความผิดฐานฆ่าผู้อื่นโดยเจตนา\n\n2. 📜 ประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 288 (บุริมสิทธิ):\n- บัญญัติว่าด้วยบุริมสิทธิพิเศษเหนืออสังหาริมทรัพย์เพื่อมูลซื้อขายอสังหาริมทรัพย์ ใช้สำหรับเอาเงินราคาอสังหาริมทรัพย์และดอกเบี้ยในเงินราคานั้น",
      found_context: true,
      sources: [
        {
          source_file: "pythainlp_thai_law (ประมวลกฎหมายอาญา)",
          page_number: null,
          score: 1.0,
          text: "มาตรา ๒๘๘ ผู้ใดฆ่าผู้อื่น ต้องระวางโทษประหารชีวิต จำคุกตลอดชีวิต หรือจำคุกตั้งแต่สิบห้าปีถึงยี่สิบปี"
        },
        {
          source_file: "civil_commercial_code_snapshot.pdf",
          page_number: 55,
          score: 1.0,
          text: "มาตรา ๒๘๘ บุริมสิทธิเหนืออสังหาริมทรัพย์เพื่อมูลซื้อขายอสังหาริมทรัพย์นั้น ใช้สำหรับเอาเงินราคาอสังหาริมทรัพย์ และดอกเบี้ยในเงินราคานั้น..."
        }
      ]
    }
  },

  // --- การเงินและธุรกิจ (Finance - สไตล์สมหมาย) ---
  {
    id: "director-liability",
    category: "finance",
    tag: "พ.ร.บ.บริษัทมหาชนฯ / กฎหมายการเงิน",
    section: "§85, 89",
    title: "ความรับผิดของกรรมการบริษัท",
    question: "กรรมการบริษัทต้องรับผิดชอบหนี้สินของบริษัทเป็นการส่วนตัวหรือไม่",
    desc: "วิเคราะห์หลักจำกัดความรับผิดและข้อยกเว้นกรณีทุจริตหรือประมาทเลินเล่ออย่างร้ายแรง",
    instantResult: {
      answer: "ตามหลักกฎหมายบริษัทมหาชนจำกัดและประมวลกฎหมายแพ่งและพาณิชย์:\n\n💼 1. หลักความรับผิดจำกัด (Limited Liability):\nโดยทั่วไป บริษัทมีสภาพเป็น \"นิติบุคคล\" แยกต่างหากจากกรรมการและผู้ถือหุ้น หนี้สินของบริษัทจึงผูกพันเฉพาะทรัพย์สินของบริษัท กรรมการไม่ต้องรับผิดชอบหนี้สินเป็นการส่วนตัว\n\n⚠️ 2. ข้อยกเว้นที่กรรมการต้องร่วมรับผิดชอบส่วนตัว (ตามมาตรา 85 และ 89):\n- กระทำการโดยทุจริต หรือจงใจปฏิบัติหน้าที่ขัดต่อกฎหมายและวัตถุประสงค์บริษัท\n- ประมาทเลินเล่ออย่างร้ายแรงจนก่อให้เกิดความเสียหายแก่บริษัทหรือเจ้าหนี้\n- มีส่วนได้เสียในธุรกรรมโดยมิได้เปิดเผย หรือนำทรัพย์สินบริษัทไปใช้ประโยชน์ส่วนตน\n- ลงนามในเอกสารอันเป็นเท็จ หรือจ่ายเงินปันผลโดยบริษัทไม่มีกำไร\n\nหากเข้าข้อยกเว้น กรรมการต้องร่วมรับผิดชอบชดใช้ค่าเสียหายต่อบริษัทและเจ้าหนี้อย่างไม่จำกัดจำนวน",
      found_context: true,
      sources: [
        {
          source_file: "พ.ร.บ. บริษัทมหาชนจำกัด พ.ศ. 2535 (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 34,
          score: 0.945,
          text: "มาตรา ๘๕ ในการดำเนินกิจการของบริษัท กรรมการต้องปฏิบัติหน้าที่ให้เป็นไปตามกฎหมาย วัตถุประสงค์ และข้อบังคับของบริษัท ตลอดจนมติที่ประชุมผู้ถือหุ้นด้วยความซื่อสัตย์สุจริตและระมัดระวังรักษาผลประโยชน์ของบริษัท"
        },
        {
          source_file: "พ.ร.บ. บริษัทมหาชนจำกัด พ.ศ. 2535 (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 36,
          score: 0.892,
          text: "มาตรา ๘๙ กรรมการต้องร่วมกันรับผิดชอบในความเสียหายใดๆ อันเกิดจากการกระทำการฝ่าฝืนมาตรา ๘๕ เว้นแต่จะพิสูจน์ได้ว่าตนมิได้มีส่วนร่วมหรือได้คัดค้านในการกระทำนั้นแล้ว"
        }
      ]
    }
  },
  {
    id: "insider-trading",
    category: "finance",
    tag: "พ.ร.บ.หลักทรัพย์ฯ / ตลาดทุน",
    section: "§240, 241",
    title: "การใช้ข้อมูลภายใน (Insider Trading)",
    question: "การใช้ข้อมูลภายในซื้อขายหุ้นมีความผิดและโทษอย่างไร",
    desc: "ตรวจสอบข้อห้ามการใช้ข้อมูลภายในที่ยังมิได้เปิดเผยต่อประชาชน และบทลงโทษ",
    instantResult: {
      answer: "ตามพระราชบัญญัติหลักทรัพย์และตลาดหลักทรัพย์ พ.ศ. 2535 (และที่แก้ไขเพิ่มเติม):\n\n📈 ข้อห้ามตามกฎหมาย (มาตรา 240 - 242):\nห้ามมิให้บุคคลใดซึ่งรู้หรือครอบครอง \"ข้อมูลภายใน\" (Inside Information) ที่มีนัยสำคัญต่อการเปลี่ยนแปลงราคาหลักทรัพย์ และยังมิได้เปิดเผยต่อประชาชน:\n1. ทำการซื้อหรือขายหลักทรัพย์นั้นด้วยตนเองหรือเพื่อผู้อื่น\n2. เปิดเผยข้อมูลภายในดังกล่าวให้บุคคลอื่นโดยรู้ว่าบุคคลนั้นอาจนำไปใช้ซื้อขายหลักทรัพย์\n\n⚖️ บทลงโทษ:\n- โทษทางอาญา: จำคุกไม่เกิน 2 ปี หรือปรับตั้งแต่ 500,000 บาท ถึง 2 เท่าของผลประโยชน์ที่ได้รับ (หรือไม่น้อยกว่า 1,000,000 บาท) หรือทั้งจำทั้งปรับ (ม.296)\n- มาตรการลงโทษทางแพ่ง: ปรับทางแพ่ง, ส่งคืนผลประโยชน์ที่ได้ทั้งหมด, และห้ามเป็นกรรมการหรือผู้บริหารในบริษัทจดทะเบียน",
      found_context: true,
      sources: [
        {
          source_file: "พ.ร.บ. หลักทรัพย์และตลาดหลักทรัพย์ พ.ศ. 2535 (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 92,
          score: 0.958,
          text: "มาตรา ๒๔๑ ห้ามมิให้บุคคลใดซึ่งรู้หรือครอบครองข้อมูลภายในที่ยังมิได้เปิดเผยต่อประชาชน ทำการซื้อหรือขายหลักทรัพย์ที่เกี่ยวข้องกับข้อมูลภายในนั้น ไม่ว่าเพื่อตนเองหรือผู้อื่น"
        }
      ]
    }
  },

  // --- ภาษีอากร (Tax - สไตล์สมศรี) ---
  {
    id: "withholding-tax",
    category: "tax",
    tag: "ประมวลรัษฎากร / ภาษีหัก ณ ที่จ่าย",
    section: "ม.3 เตรส, ม.54",
    title: "บริษัทไม่หักภาษี ณ ที่จ่าย",
    question: "บริษัทไม่หักภาษี ณ ที่จ่าย มีความรับผิดและโทษตามกฎหมายอย่างไร",
    desc: "ตรวจสอบหน้าที่ผู้จ่ายเงิน ความรับผิดร่วม และเงินเพิ่มร้อยละ 1.5 ต่อเดือน",
    instantResult: {
      answer: "ตามประมวลรัษฎากร มาตรา 3 เตรส และมาตรา 54 บัญญัติความรับผิดกรณีไม่หักภาษี ณ ที่จ่ายไว้ดังนี้:\n\n💰 1. หน้าที่และความรับผิดร่วม (มาตรา 54):\nหากผู้จ่ายเงินมีหน้าที่ต้องหักภาษี ณ ที่จ่าย แต่ละเลยไม่หัก หรือหักแล้วแต่นำส่งไม่ครบ:\n- \"ผู้จ่ายเงินต้องร่วมรับผิดกับผู้มีเงินได้\" ในการชำระภาษีตามจำนวนที่ต้องหัก\n- กรมสรรพากรมีอำนาจเรียกเก็บภาษีจากผู้จ่ายเงินได้ทันทีโดยไม่ต้องไปไล่เบี้ยจากผู้รับเงินก่อน\n\n📈 2. เงินเพิ่มและค่าปรับ:\n- ต้องเสีย \"เงินเพิ่ม\" ในอัตราร้อยละ 1.5 ต่อเดือน (หรือเศษของเดือน) ของเงินภาษีที่ค้างชำระ ตามมาตรา 27\n- ต้องระวางโทษปรับทางอาญาไม่เกิน 2,000 บาท ตามมาตรา 35\n- หากมีเจตนาหลีกเลี่ยงภาษี มีโทษจำคุกตั้งแต่ 3 เดือน ถึง 7 ปี และปรับตั้งแต่ 2,000 ถึง 200,000 บาท ตามมาตรา 37",
      found_context: true,
      sources: [
        {
          source_file: "ประมวลรัษฎากร (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 18,
          score: 0.965,
          text: "มาตรา ๕๔ ถ้าผู้จ่ายเงินตามมาตรา ๕๐ หรือมาตรา ๓ เตรส มิได้หักและนำเงินส่ง หรือได้หักและนำส่งแล้วแต่ไม่ครบจำนวนที่ถูกต้อง ผู้จ่ายเงินต้องร่วมรับผิดกับผู้มีเงินได้ในการเสียภาษีที่ต้องชำระตามจำนวนเงินภาษีที่มิได้หักและนำส่ง"
        },
        {
          source_file: "ประมวลรัษฎากร (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 12,
          score: 0.910,
          text: "มาตรา ๓ เตรส ให้บุคคล คณะบุคคล หรือนิติบุคคลซึ่งจ่ายเงินได้พึงประเมินตามมาตรา ๔๐ มีหน้าที่หักภาษี ณ ที่จ่ายตามหลักเกณฑ์ เงื่อนไข และอัตราที่อธิบดีกรมสรรพากรกำหนด"
        }
      ]
    }
  },
  {
    id: "stamp-duty",
    category: "tax",
    tag: "ประมวลรัษฎากร / อากรแสตมป์",
    section: "ม.118",
    title: "สัญญาเช่าไม่ติดอากรแสตมป์",
    question: "สัญญาเช่าที่ไม่ได้ปิดแสตมป์บริบูรณ์ สามารถนำมาฟ้องคดีต่อศาลได้หรือไม่",
    desc: "วิเคราะห์ผลทางกฎหมายของตราสารที่มิได้ปิดอากรแสตมป์บริบูรณ์ตามมาตรา 118",
    instantResult: {
      answer: "ตามประมวลรัษฎากร มาตรา 118 บัญญัติถึงผลทางคดีของตราสารที่มิได้ปิดอากรแสตมป์ไว้ชัดเจน:\n\n⚖️ ผลทางกฎหมายตามมาตรา 118:\n\"ตราสารใดมิได้ปิดแสตมป์บริบูรณ์ จะใช้ต้นฉบับ คู่ฉบับ คู่ฉีก หรือสำเนาตราสารนั้นเป็นพยานหลักฐานในคดีแพ่งไม่ได้\"\n\n📌 แนวปฏิบัติและทางออกตามคำพิพากษาศาลฎีกา:\n1. ในวันที่ยื่นฟ้องหรือนำสืบพยาน หากสัญญาเช่ายังไม่ได้ปิดแสตมป์บริบูรณ์ ศาลจะไม่รับฟังเป็นพยานหลักฐานในคดีแพ่ง\n2. แต่ข้อบกพร่องนี้สามารถ \"แก้ไขได้\" โดยคู่ความสามารถนำสัญญานั้นไปยื่นต่อเจ้าพนักงานสรรพากรเพื่อชำระค่าอากรแสตมป์พร้อมเงินเพิ่มตามกฎหมายก่อนที่ศาลชั้นต้นจะมีคำพิพากษา\n3. เมื่อปิดแสตมป์บริบูรณ์และขีดฆ่าถูกต้องแล้ว ศาลจะรับฟังเป็นพยานหลักฐานแห่งหนี้และสิทธิตามสัญญาเช่านั้นได้",
      found_context: true,
      sources: [
        {
          source_file: "ประมวลรัษฎากร (สำนักงานคณะกรรมการกฤษฎีกา)",
          page_number: 45,
          score: 0.982,
          text: "มาตรา ๑๑๘ ตราสารใดมิได้ปิดแสตมป์บริบูรณ์ จะใช้ต้นฉบับ คู่ฉบับ คู่ฉีก หรือสำเนาตราสารนั้นเป็นพยานหลักฐานในคดีแพ่งไม่ได้ จนกว่าจะได้เสียอากรแสตมป์และขีดฆ่าโดยถูกต้องแล้ว"
        }
      ]
    }
  }
];

const TOUR_STEPS = [
  {
    step: 1,
    badge: "สถาปัตยกรรมระดับคดีจริง",
    icon: "✻",
    title: "Thai Legal RAG — AI Legal Intelligence",
    desc: "ระบบสืบค้นข้อกฎหมายไทยที่ผสมผสาน Editorial Precision เข้ากับสถาปัตยกรรม Hybrid RAG เพื่อตัดปัญหา Hallucination โดยอิงตัวบทจริงก่อนตอบทุกครั้ง",
    tip: "ครอบคลุมทั้งประมวลกฎหมายอาญา, แพ่งและพาณิชย์, กฎหมายการเงินธุรกิจ (สไตล์สมหมาย) และภาษีอากร (สไตล์สมศรี)"
  },
  {
    step: 2,
    badge: "การสืบค้นแบบคู่ขนาน",
    icon: "⚡",
    title: "Hybrid Exact + Multilingual-E5",
    desc: "รองรับทั้งการพิมพ์ข้อเท็จจริงแบบภาษาธรรมชาติ และการค้นหาเจาะจงเลขมาตรา ระบบจะผสาน Exact Section Match เข้ากับ Vector Similarity ในหลักมิลลิวินาที",
    tip: "ประมวลผลทั้งเลขอารบิกและเลขไทยให้อัตโนมัติโดยไม่ต้องสลับแป้นพิมพ์"
  },
  {
    step: 3,
    badge: "เลือกโมเดลภาษาไทยได้",
    icon: "🌀",
    title: "รองรับ Typhoon (SCB 10X) & Gemini Flash",
    desc: "ผู้ใช้งานสามารถสลับเอนจิน LLM ได้ระหว่าง Google Gemini 2.5 Flash และ Typhoon LLM โมเดลภาษาไทยเฉพาะทางที่พัฒนาโดย SCB 10X",
    tip: "Typhoon ผ่านการเทรนภาษาไทยเชิงลึก เข้าใจศัพท์เฉพาะทางนิติกรรมและภาษากฎหมายไทยอย่างลึกซึ้ง"
  },
  {
    step: 4,
    badge: "ความโปร่งใสตรวจสอบได้",
    icon: "📚",
    title: "Interactive Evidence Drawer",
    desc: "ทุกคำตอบจะแสดงกล่องเอกสารอ้างอิงต้นฉบับ ระบุชื่อประมวลฯ เลขหน้า และคะแนน Vector Cosine Score อย่างเปิดเผยเพื่อความน่าเชื่อถือทางวิชาการ",
    tip: "คลิกชิปคำถามตัวอย่างหรือปุ่ม 'รันเดโม่เคสตัวอย่าง' เพื่อทดสอบระบบได้ทันที!"
  }
];

function formatPage(pageNumber) {
  return pageNumber == null ? "ไม่ระบุเลขหน้า" : `หน้า ${pageNumber}`;
}

// Typewriter / Streaming component for realistic prose streaming
function TypewriterProse({ fullText, isTyping, onFinished }) {
  const [displayedText, setDisplayedText] = useState(isTyping ? "" : fullText);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(fullText);
      return;
    }

    let currentIndex = 0;
    const chunkSize = 3;
    const interval = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= fullText.length) {
        setDisplayedText(fullText);
        clearInterval(interval);
        if (onFinished) onFinished();
      } else {
        setDisplayedText(fullText.slice(0, currentIndex));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [fullText, isTyping]);

  return (
    <div className="godly-prose">
      {displayedText}
      {isTyping && displayedText.length < fullText.length && (
        <span className="godly-type-cursor">▌</span>
      )}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("thai_legal_theme") || "light";
  });
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [expandedSources, setExpandedSources] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [activePresetId, setActivePresetId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("thai_legal_theme", theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function triggerToast(text) {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage("");
    }, 2400);
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    triggerToast(nextTheme === "light" ? "📜 สลับเป็นธีม Ink & Paper" : "◈ สลับเป็นธีม Obsidian 3D");
  }

  function toggleSourceAccordion(messageId) {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    triggerToast("✨ คัดลอกคำตอบลงคลิปบอร์ดแล้ว");
  }

  function clearChat() {
    setMessages([]);
    setError("");
    triggerToast("🗑️ ล้างการสนทนา เริ่มต้นใหม่แล้ว");
  }

  async function handleSend(textToSend = null, instantData = null, presetId = null) {
    const questionText = (textToSend || inputQuestion).trim();
    if (!questionText || loading) return;

    if (presetId) setActivePresetId(presetId);

    const userMessageId = Date.now();
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        sender: "user",
        text: questionText,
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
      }
    ];

    setMessages(newMessages);
    setInputQuestion("");
    setLoading(true);
    setError("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (instantData) {
      setTimeout(() => {
        setMessages([
          ...newMessages,
          {
            id: Date.now() + 1,
            sender: "assistant",
            text: instantData.answer,
            sources: instantData.sources || [],
            found_context: instantData.found_context,
            isDemo: true,
            providerUsed: selectedModel,
            isNewlyGenerated: true,
            time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setLoading(false);
      }, 450);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          provider: selectedModel,
          category: selectedCategory
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "ระบบไม่สามารถตอบคำถามได้");
      }

      setMessages([
        ...newMessages,
        {
          id: Date.now() + 1,
          sender: "assistant",
          text: payload.answer,
          sources: payload.sources || [],
          found_context: payload.found_context,
          isDemo: false,
          providerUsed: payload.provider_used || selectedModel,
          isNewlyGenerated: true,
          time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (requestError) {
      const matchedPreset = PRESET_QUERIES.find((p) =>
        questionText.includes(p.question) || p.question.includes(questionText)
      );

      if (matchedPreset) {
        setMessages([
          ...newMessages,
          {
            id: Date.now() + 1,
            sender: "assistant",
            text: matchedPreset.instantResult.answer,
            sources: matchedPreset.instantResult.sources || [],
            found_context: matchedPreset.instantResult.found_context,
            isDemo: true,
            providerUsed: selectedModel,
            isNewlyGenerated: true,
            fallbackNotice: "เชื่อมต่อ Live Backend ไม่สำเร็จ ระบบดึงข้อมูลตัวอย่างที่ตรวจสอบแล้วมาแสดงแทน",
            time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        setError(requestError.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaInput(e) {
    setInputQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
  }

  function startTour() {
    setTourStep(0);
    setTourOpen(true);
  }

  function nextTourStep() {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      setTourOpen(false);
    }
  }

  function prevTourStep() {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  }

  function autoPlayFromTour() {
    setTourOpen(false);
    const demo = PRESET_QUERIES[0];
    handleSend(demo.question, demo.instantResult, demo.id);
  }

  const filteredPresets = selectedCategory === "all"
    ? PRESET_QUERIES
    : PRESET_QUERIES.filter((p) => p.category === selectedCategory);

  const currentTour = TOUR_STEPS[tourStep];

  return (
    <div className="godly-shell">
      {/* Ambient Radial Lights */}
      <div className="godly-orb orb-alpha" />
      <div className="godly-orb orb-beta" />

      {/* Floating Spring Toast */}
      {toastMessage && (
        <div className="godly-toast-pill" role="status">
          <span className="toast-spark">✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Architectural Header */}
      <header className="godly-header">
        <div className="godly-header-left">
          <a className="godly-brand" href="/" aria-label="Thai Legal RAG Home">
            <span className="godly-brand-emblem spinning-spark">✻</span>
            <div className="godly-brand-meta">
              <span className="godly-brand-title">
                {theme === "light" ? "ค้นกฎหมาย" : "ค้นกฎหมาย"}
                <span className="godly-sub-tag"> / THAI LEGAL RAG</span>
              </span>
              <span className="godly-status-badge">
                <span className="status-dot-pulse" />
                <span>3,361+ STATUTES LIVE</span>
              </span>
            </div>
          </a>
        </div>

        <div className="godly-header-right">
          {/* LLM Engine Switcher */}
          <div className="godly-model-selector" title="เลือกโมเดลภาษาในการสังเคราะห์คำตอบ">
            <button
              type="button"
              className={`model-pill-opt ${selectedModel === "gemini" ? "opt-active" : ""}`}
              onClick={() => {
                setSelectedModel("gemini");
                triggerToast("⚡ สลับเป็นโมเดล Gemini 2.5 Flash");
              }}
            >
              <span>⚡ Gemini 2.5</span>
            </button>
            <button
              type="button"
              className={`model-pill-opt ${selectedModel === "typhoon" ? "opt-active" : ""}`}
              onClick={() => {
                setSelectedModel("typhoon");
                triggerToast("🌀 สลับเป็นโมเดล Typhoon (SCB 10X)");
              }}
            >
              <span>🌀 Typhoon</span>
            </button>
          </div>

          <button
            type="button"
            className="godly-pill-btn tour-trigger"
            onClick={startTour}
            title="เปิดคู่มือแนะนำระบบ"
          >
            <span className="btn-sparkle">✦</span>
            <span>แนะนำระบบ</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              className="godly-pill-btn"
              onClick={clearChat}
              title="เริ่มคำถามใหม่"
            >
              <span>+ คำถามใหม่</span>
            </button>
          )}

          {/* Theme Switcher Segment */}
          <button
            type="button"
            className="godly-theme-toggle"
            onClick={toggleTheme}
            title={`คลิกเพื่อสลับเป็น ${theme === "light" ? "Obsidian 3D" : "Ink & Paper"}`}
          >
            <span className="theme-toggle-icon">{theme === "light" ? "📜" : "◈"}</span>
            <span className="theme-toggle-label">{theme === "light" ? "Ink & Paper" : "Obsidian 3D"}</span>
          </button>

          <a
            href="https://github.com/ThawatchaiDrakeao/Thai-Legal-RAG-Showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="godly-github-pill"
            title="GitHub Repository"
          >
            <span>GitHub</span>
            <span className="arrow-glyph">↗</span>
          </a>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="godly-container">
        {messages.length === 0 ? (
          /* Editorial Hero View */
          <div className="godly-hero-area">
            <div className="godly-category-chip">
              <span className="chip-indicator">●</span>
              <span>AI LEGAL RESEARCH SYSTEM // JURISDICTION OF THAILAND</span>
            </div>

            <h1 className="godly-hero-title">
              ค้นคว้าข้อกฎหมายไทย<br />
              <span className="hero-highlight">แม่นยำระดับคดีจริง</span>
            </h1>

            <p className="godly-hero-desc">
              ระบบสืบค้นข้อกฎหมายด้วยสถาปัตยกรรม Hybrid Retrieval (Exact Match + Multilingual-E5)
              ครอบคลุมกฎหมายอาญา, แพ่งและพาณิชย์, การเงิน/ธุรกิจ (สไตล์สมหมาย) และภาษีอากร (สไตล์สมศรี)
            </p>

            {/* Category Filter Tabs */}
            <div className="godly-categories-nav">
              <span className="cat-label-prefix">หมวดหมู่คดี:</span>
              <div className="cat-pills-container">
                {LAW_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-filter-pill ${selectedCategory === cat.id ? "filter-active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      triggerToast(`ตีกรอบการค้นหา: ${cat.label}`);
                    }}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-text">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Omnibox / Prompt Card */}
            <div className="godly-omnibox">
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ข้อเท็จจริงของคุณ เช่น บริษัทไม่หักภาษี ณ ที่จ่าย, สัญญาเช่าไม่ติดอากรแสตมป์, หรือระบุเลขมาตรา..."
                rows="2"
                maxLength="2000"
                disabled={loading}
              />

              <div className="godly-omnibox-footer">
                <div className="omnibox-meta-left">
                  <span className="tech-badge">
                    <span>⚡ HYBRID FAISS</span>
                    <span className="meta-sep">•</span>
                    <span>{selectedModel === "typhoon" ? "🌀 TYPHOON 70B" : "⚡ GEMINI 2.5 FLASH"}</span>
                    <span className="meta-sep">•</span>
                    <span className="meta-cat-tag">
                      {LAW_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "ทั้งหมด"}
                    </span>
                  </span>
                </div>

                <div className="omnibox-meta-right">
                  <span className="char-count">{inputQuestion.length}/2,000</span>
                  <button
                    type="button"
                    className="godly-send-btn"
                    onClick={() => handleSend()}
                    disabled={loading || !inputQuestion.trim()}
                    title="ส่งคำถาม (Enter)"
                  >
                    {loading ? <span className="godly-spinner" /> : <span>↑</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Bento-style Presets Grid */}
            <div className="godly-bento-section">
              <div className="bento-header">
                <span className="bento-label">
                  ✦ กรณีศึกษาตัวอย่าง (BENCHMARK PRESETS • {filteredPresets.length} ข้อ)
                </span>
                <span className="bento-hint">คลิกเพื่อดูการวิเคราะห์และตัวบทจริง</span>
              </div>

              <div className="godly-bento-grid">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`bento-card ${activePresetId === preset.id ? "card-active" : ""}`}
                    onClick={() => handleSend(preset.question, preset.instantResult, preset.id)}
                  >
                    <div className="card-top-row">
                      <span className="card-section-tag">{preset.section}</span>
                      <span className="card-law-tag">{preset.tag}</span>
                    </div>
                    <div className="card-title-text">{preset.question}</div>
                    <div className="card-desc-text">{preset.desc}</div>
                    <div className="card-action-hover">
                      <span>รันเคสตัวอย่าง</span>
                      <span className="action-arrow">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="godly-stream-layout">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`godly-message-item ${msg.sender === "user" ? "msg-user" : "msg-assistant"}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {msg.sender === "assistant" && (
                  <div className="assistant-avatar">
                    {msg.providerUsed === "typhoon" ? "🌀" : "✻"}
                  </div>
                )}

                <div className="message-content-wrapper">
                  {msg.sender === "user" ? (
                    <div className="user-query-card">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="assistant-response-card">
                      <div className="response-header-meta">
                        <span className="grounded-status-tag">
                          <span className="tag-green-dot">●</span> GROUNDED CITATION
                        </span>
                        <span className="model-indicator-tag">
                          {msg.providerUsed === "typhoon" ? "🌀 TYPHOON 70B" : "⚡ GEMINI 2.5 FLASH"}
                        </span>
                        {msg.isDemo && (
                          <span className="demo-verified-tag">✓ VERIFIED CORPUS</span>
                        )}
                        <span className="msg-timestamp">{msg.time}</span>
                      </div>

                      {msg.fallbackNotice && (
                        <div className="fallback-alert-banner">
                          ℹ️ {msg.fallbackNotice}
                        </div>
                      )}

                      {!msg.found_context && (
                        <div className="not-found-alert-banner">
                          ⚠️ ไม่พบข้อมูลมาตราที่เกี่ยวข้องในคลังเอกสาร
                        </div>
                      )}

                      {/* Main Prose with Typewriter */}
                      <TypewriterProse
                        fullText={msg.text}
                        isTyping={Boolean(msg.isNewlyGenerated)}
                        onFinished={() => {
                          msg.isNewlyGenerated = false;
                        }}
                      />

                      {/* Evidence Drawer */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="godly-evidence-box">
                          <button
                            type="button"
                            className="evidence-toggle-btn"
                            onClick={() => toggleSourceAccordion(msg.id)}
                          >
                            <span className="toggle-left">
                              <span className="book-glyph">📖</span>
                              <strong>ตัวบทและพยานหลักฐานที่ใช้ประกอบ ({msg.sources.length} มาตรา)</strong>
                            </span>
                            <span className="toggle-right">
                              <span>
                                {expandedSources[msg.id] !== false
                                  ? "ย่อเก็บ"
                                  : "เปิดดูตัวบทฉบับเต็ม"}
                              </span>
                              <span
                                className={`chevron-glyph ${expandedSources[msg.id] !== false ? "chevron-open" : ""}`}
                              >
                                ▾
                              </span>
                            </span>
                          </button>

                          {expandedSources[msg.id] !== false && (
                            <div className="evidence-items-container">
                              {msg.sources.map((source, idx) => (
                                <div
                                  key={idx}
                                  className="evidence-card-3d"
                                  style={{ animationDelay: `${idx * 0.08}s` }}
                                >
                                  <div className="evidence-card-top">
                                    <div className="source-title-group">
                                      <span className="source-seq-pill">§{idx + 1}</span>
                                      <strong className="source-doc-name">{source.source_file}</strong>
                                    </div>
                                    <span className="source-cosine-badge">
                                      ตรงกัน {(source.score * 100).toFixed(1)}%
                                    </span>
                                  </div>

                                  <div className="source-meta-row">
                                    <span>{formatPage(source.page_number)}</span>
                                    <span>•</span>
                                    <span>Vector Cosine: {source.score.toFixed(3)}</span>
                                  </div>

                                  <blockquote className="source-quote-body">
                                    {source.text}
                                  </blockquote>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="response-actions-row">
                        <button
                          type="button"
                          className="action-copy-btn"
                          onClick={() => copyToClipboard(msg.text)}
                        >
                          📋 คัดลอกคำตอบ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="godly-message-item msg-assistant">
                <div className="assistant-avatar avatar-pulse">
                  {selectedModel === "typhoon" ? "🌀" : "✻"}
                </div>
                <div className="message-content-wrapper">
                  <div className="godly-thinking-card">
                    <span className="thinking-dot dot-1" />
                    <span className="thinking-dot dot-2" />
                    <span className="thinking-dot dot-3" />
                    <span className="thinking-label">
                      กำลังสืบค้นข้อกฎหมายและประมวลผลด้วย {selectedModel === "typhoon" ? "Typhoon LLM..." : "Gemini 2.5 Flash..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="godly-error-banner">
            <span className="error-icon-box">!</span>
            <div className="error-body">
              <strong>ข้อผิดพลาด:</strong> {error}
              <button
                type="button"
                className="error-recovery-btn"
                onClick={() => handleSend(PRESET_QUERIES[0].question, PRESET_QUERIES[0].instantResult)}
              >
                ดูตัวอย่างผลลัพธ์จริง (Instant Demo)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Dock for Ongoing Chat */}
      {messages.length > 0 && (
        <footer className="godly-bottom-dock">
          <div className="dock-inner-container">
            <div className="dock-chips-bar">
              <span className="chips-title">เคสตัวอย่าง:</span>
              {filteredPresets.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="dock-chip-btn"
                  onClick={() => handleSend(preset.question, preset.instantResult, preset.id)}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            <div className="dock-input-wrapper">
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="ถามข้อกฎหมายเพิ่มเติม... (กด Enter เพื่อส่ง)"
                rows="1"
                maxLength="2000"
                disabled={loading}
              />
              <button
                type="button"
                className="dock-send-btn"
                onClick={() => handleSend()}
                disabled={loading || !inputQuestion.trim()}
                title="ส่งคำถาม"
              >
                {loading ? <span className="godly-spinner-sm" /> : <span>↑</span>}
              </button>
            </div>

            <div className="dock-disclaimer-text">
              Thai Legal RAG เป็นระบบสืบค้นข้อกฎหมายเพื่อการศึกษาและวิจัย ไม่ใช่คำปรึกษาทางกฎหมายจากทนายความ
            </div>
          </div>
        </footer>
      )}

      {/* Interactive Guided Tour Modal */}
      {tourOpen && (
        <div className="godly-modal-backdrop" onClick={() => setTourOpen(false)}>
          <div className="godly-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div className="modal-step-indicator">
                <span className="step-count">STEP {currentTour.step} / {TOUR_STEPS.length}</span>
                <span className="step-badge">{currentTour.badge}</span>
              </div>
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setTourOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-hero-content">
              <div className="modal-emblem-icon">{currentTour.icon}</div>
              <h2 className="modal-main-title">{currentTour.title}</h2>
              <p className="modal-main-desc">{currentTour.desc}</p>
              <div className="modal-highlight-box">
                <span className="highlight-star">✦</span>
                <span>{currentTour.tip}</span>
              </div>
            </div>

            <div className="modal-dots-track">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`modal-progress-dot ${idx === tourStep ? "dot-selected" : ""}`}
                  onClick={() => setTourStep(idx)}
                />
              ))}
            </div>

            <div className="modal-action-bar">
              <div className="bar-left">
                {tourStep > 0 && (
                  <button type="button" className="modal-prev-btn" onClick={prevTourStep}>
                    ย้อนกลับ
                  </button>
                )}
              </div>
              <div className="bar-right">
                <button
                  type="button"
                  className="modal-run-btn"
                  onClick={autoPlayFromTour}
                >
                  🚀 รันเดโม่เคสตัวอย่าง
                </button>
                <button type="button" className="modal-next-btn" onClick={nextTourStep}>
                  {tourStep === TOUR_STEPS.length - 1 ? "เริ่มใช้งาน" : "ถัดไป ➔"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
