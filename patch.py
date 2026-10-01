with open('src/pages/Settings.tsx', 'r') as f:
    lines = f.readlines()

replacement = """                      const isCastleTowerStyle = page.offsetWidth > page.offsetHeight;
                      const targetHeight = isCastleTowerStyle ? 794 : 1123;
                      if (contentHeight > targetHeight) {
                        const scale = targetHeight / contentHeight;
                        // Use CSS zoom for WebKit/Blink browsers (like Chrome) which handles layout scaling perfectly
                        contentDiv.style.zoom = scale.toString();
                      }
                    }
                  });

                  const images = document.getElementsByTagName("img");
                  const promises = Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                      img.onload = () => resolve(null);
                      img.onerror = () => resolve(null);
                    });
                  });
                  Promise.all(promises).then(() => {
                    setTimeout(() => {
                      window.focus();
                      window.print();
                    }, 500);
                  });
                };
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          alert("الرجاء السماح بالنوافذ المنبثقة لفتح نافذة الطباعة المباشرة");
        }
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
        setIsExporting(false);
        return;
      }

      // Loop over and capture each page element sequentially using html2canvas
      for (let i = 0; i < pageElements.length; i++) {
        const progressMessage = i === 0
          ? `جاري معالجة صفحة الغلاف الرئيسية... (إجمالي ${pageElements.length} صفحات)`
          : `جاري معالجة الأسبوع ${i} من أصل ${pageElements.length - 1}... (إجمالي ${pageElements.length} صفحات)`;
        setExportProgress(progressMessage);

        const pageEl = pageElements[i];
        
        const restoreColors = patchColorsForHtml2Canvas(pageEl);
        let canvas;
        try {
          canvas = await html2canvas(pageEl, {
            scale: 3,
            useCORS: true,
            backgroundColor: isCastleTowerStyle ? "#FFFDF9" : "#FDFBF7",
            logging: false,
          });
        } finally {
          restoreColors();
        }

        const imgData = canvas.toDataURL("image/png");\n"""

# Delete lines 1637 (0-indexed 1636) to 1714 inclusive, and insert the new text
new_lines = lines[:1636] + [replacement] + lines[1715:]

with open('src/pages/Settings.tsx', 'w') as f:
    f.writelines(new_lines)
