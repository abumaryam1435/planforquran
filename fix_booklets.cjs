const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const htmlOrderTarget = `            if (isCastleTowerStyle) {
              orderedElements.push(paddedElements[frontLeftIdx]);
              orderedElements.push(paddedElements[frontRightIdx]);
              orderedElements.push(paddedElements[backRightIdx]);
              orderedElements.push(paddedElements[backLeftIdx]);
            }`;

const htmlOrderReplace = `            if (isCastleTowerStyle) {
              orderedElements.push(paddedElements[frontRightIdx]);
              orderedElements.push(paddedElements[frontLeftIdx]);
              orderedElements.push(paddedElements[backLeftIdx]);
              orderedElements.push(paddedElements[backRightIdx]);
            }`;

content = content.replace(htmlOrderTarget, htmlOrderReplace);

const htmlStyleTarget = `            let topStyle = '';
            let bottomStyle = '';
            if (isCastleTowerStyle) {
              const isBackSide = (i / 2) % 2 === 1;
              if (isBackSide) {
                topStyle = 'transform: rotate(180deg);';
                bottomStyle = 'transform: rotate(180deg);';
              } else {
                bottomStyle = 'transform: rotate(180deg);';
              }
            }`;

const htmlStyleReplace = `            let topStyle = '';
            let bottomStyle = '';
            if (isCastleTowerStyle) {
              const isBackSide = (i / 2) % 2 === 1;
              if (isBackSide) {
                topStyle = 'transform: rotate(180deg);';
                bottomStyle = 'transform: rotate(180deg);';
              } else {
                topStyle = 'transform: rotate(180deg);';
                bottomStyle = '';
              }
            }`;

content = content.replace(htmlStyleTarget, htmlStyleReplace);

const pdfPosTarget = `        const frontLeftIdx = 2 * s; 
        if (paddedImages[frontLeftIdx]) {
          pdf.addImage(
            paddedImages[frontLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX,
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        const frontRightIdx = N - 1 - 2 * s;
        if (paddedImages[frontRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[frontRightIdx] ? rotatedPaddedImages[frontRightIdx] : paddedImages[frontRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        pdf.addPage(jsPdfPaper, pdfOrientation);

        const backRightIdx = 2 * s + 1; 
        if (paddedImages[backRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backRightIdx] ? rotatedPaddedImages[backRightIdx] : paddedImages[backRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
        
        const backLeftIdx = N - 2 - 2 * s; 
        if (paddedImages[backLeftIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backLeftIdx] ? rotatedPaddedImages[backLeftIdx] : paddedImages[backLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, 
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }`;

const pdfPosReplace = `        const frontLeftIdx = 2 * s; 
        if (paddedImages[frontLeftIdx]) {
          pdf.addImage(
            paddedImages[frontLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX,
            isCastleTowerStyle ? bottomY : topY, // Castle: Bottom half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        const frontRightIdx = N - 1 - 2 * s;
        if (paddedImages[frontRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[frontRightIdx] ? rotatedPaddedImages[frontRightIdx] : paddedImages[frontRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? topY : topY, // Castle: Top half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        pdf.addPage(jsPdfPaper, pdfOrientation);

        const backRightIdx = 2 * s + 1; 
        if (paddedImages[backRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backRightIdx] ? rotatedPaddedImages[backRightIdx] : paddedImages[backRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? bottomY : topY, // Castle: Bottom half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
        
        const backLeftIdx = N - 2 - 2 * s; 
        if (paddedImages[backLeftIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backLeftIdx] ? rotatedPaddedImages[backLeftIdx] : paddedImages[backLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, 
            isCastleTowerStyle ? topY : topY, // Castle: Top half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }`;

content = content.replace(pdfPosTarget, pdfPosReplace);

fs.writeFileSync('src/pages/Settings.tsx', content);
