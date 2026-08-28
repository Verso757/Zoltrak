import re

with open('hostinger_deploy/index.php', 'r', encoding='utf-8') as f:
    code = f.read()

# Define regex pattern to find the old switchTab function inside index.php
pattern = re.compile(
    r'function switchTab\(tabId\) \{.*?document\.querySelectorAll\(\'.app-view\'\)\.forEach\(v => v\.classList\.add\(\'hidden\'\)\);.*?document\.querySelectorAll\(\'\.tab-btn\'\)\.forEach\(b => \{.*?b\.classList\.remove\([^\)]+\);.*?b\.classList\.add\([^\)]+\);.*?\}\);.*?const targetView = document\.getElementById\(`view-\$\{tabId\}`\);.*?const targetBtn = document\.getElementById\(`tab-btn-\$\{tabId\}`\);.*?if \(targetView && targetBtn\) \{.*?targetView\.classList\.remove\(\'hidden\'\);.*?targetBtn\.classList\.add\([^\)]+\);.*?targetBtn\.classList\.remove\([^\)]+\);.*?\}',
    re.DOTALL
)

replacement = """function switchTab(tabId) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('bg-sky-50', 'text-sky-700', 'font-semibold');
                b.classList.add('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-700');
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetBtn = document.getElementById(`tab-btn-${tabId}`);
            if (targetView && targetBtn) {
                targetView.classList.remove('hidden');
                targetBtn.classList.add('bg-sky-50', 'text-sky-700', 'font-semibold');
                targetBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-700');
            }"""

if pattern.search(code):
    print("Found matching switchTab! Replacing...")
    code = pattern.sub(replacement, code)
else:
    print("Could not find matching switchTab.")

with open('hostinger_deploy/index.php', 'w', encoding='utf-8') as f:
    f.write(code)

