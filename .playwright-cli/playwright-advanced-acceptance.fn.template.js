async function(page) {
  function pickRandom(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  async function closeBlockingModal() {
    const buttons = [
      page.getByRole('button', { name: /我知道了/ }),
      page.getByRole('button', { name: /关闭指南/ }),
      page.getByRole('button', { name: /关闭使用指南/ }),
      page.getByRole('button', { name: /^关闭$/ }),
      page.getByRole('button', { name: /完成/ }),
      page.getByRole('button', { name: /关闭利润说明弹窗/ }),
    ];

    for (const btn of buttons) {
      const ok =
        (await btn.count()) > 0 &&
        (await btn.first().isVisible().catch(() => false));
      if (!ok) continue;
      try {
        await btn.first().click({ timeout: 800, force: true });
        await page.waitForTimeout(100);
        return true;
      } catch {
        // try next
      }
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(100);
    return false;
  }

  async function selectRegion(regionName) {
    await closeBlockingModal();
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: regionName, exact: true }).click();
    await page.waitForTimeout(260);
  }

  async function getLabeledComboboxValue(labelText) {
    const label = page.getByText(labelText, { exact: true }).first();
    const visible = await label.isVisible().catch(() => false);
    if (!visible) return null;

    const value = await label
      .locator('..')
      .getByRole('combobox')
      .first()
      .innerText()
      .catch(() => '');

    const normalized = sanitizeName(value);
    return normalized.length > 0 ? normalized : null;
  }

  function sanitizeName(name) {
    return name.replace(/[\s\n\r]+/g, '').trim();
  }

  function isEmptyTagValue(value) {
    return value === '无' || value === '_none';
  }

  function extractPrices(text) {
    return [...text.matchAll(/¥(\d+)/g)].map((match) => Number(match[1]));
  }

  function parseRareRecipeCounts(text) {
    const match = text.match(/料理\s*\((\d+)\s*\/\s*(\d+)\)/);
    if (!match) return null;
    return {
      visible: Number(match[1]),
      raw: Number(match[2]),
    };
  }

  function parseSingleCount(text, label) {
    const match = text.match(new RegExp(`${label}\\s*\\((\\d+)\\)`));
    return match ? Number(match[1]) : null;
  }

  async function isSettingSwitchChecked(labelText) {
    const section = page.getByText(labelText, { exact: true }).first().locator('..').locator('..');
    const checked = await section.getByRole('switch').first().getAttribute('aria-checked').catch(() => 'false');
    return checked === 'true';
  }

  async function ensureSettingSwitchEnabled(labelText) {
    const section = page.getByText(labelText, { exact: true }).first().locator('..').locator('..');
    const toggle = section.getByRole('switch').first();
    if ((await toggle.getAttribute('aria-checked').catch(() => 'false')) !== 'true') {
      await toggle.click();
      await page.waitForTimeout(160);
    }
    return isSettingSwitchChecked(labelText);
  }

  async function getNormalRecipeCardPrices(limit) {
    const cards = page.locator('div').filter({ has: page.getByText(/基础烹饪时间/) });
    const count = Math.min(await cards.count(), limit);
    const prices = [];

    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).innerText().catch(() => '');
      const matchedPrices = extractPrices(text);
      if (matchedPrices.length > 0) {
        prices.push(matchedPrices[0]);
      }
    }

    return prices;
  }

  async function chooseRareCombinationWithVisibleRecipes() {
    const foodButtons = page
      .locator('p', { hasText: '点单料理 Tag:' })
      .first()
      .locator('..')
      .getByRole('button');
    const bevButtons = page
      .locator('p', { hasText: '点单酒水 Tag:' })
      .first()
      .locator('..')
      .getByRole('button');

    const foodCount = await foodButtons.count();
    const bevCount = await bevButtons.count();

    for (let foodIndex = 0; foodIndex < foodCount; foodIndex++) {
      const foodTag = sanitizeName(await foodButtons.nth(foodIndex).innerText().catch(() => ''));
      await closeBlockingModal();
      await foodButtons.nth(foodIndex).click();
      await page.waitForTimeout(100);

      for (let bevIndex = 0; bevIndex < bevCount; bevIndex++) {
        const bevTag = sanitizeName(await bevButtons.nth(bevIndex).innerText().catch(() => ''));
        await closeBlockingModal();
        await bevButtons.nth(bevIndex).click();
        await page.waitForTimeout(140);

        const recipeHeadingText = await page.getByRole('heading', { name: /料理 \(/ }).first().innerText().catch(() => '');
        const bevHeadingText = await page.getByRole('heading', { name: /酒水 \(/ }).first().innerText().catch(() => '');
        const recipeCounts = parseRareRecipeCounts(recipeHeadingText);
        const beverageCount = parseSingleCount(bevHeadingText, '酒水');

        if (recipeCounts && recipeCounts.visible > 0 && (beverageCount == null || beverageCount > 0)) {
          return {
            foodTag,
            bevTag,
            recipeCounts,
            beverageCount,
          };
        }
      }
    }

    return null;
  }

  async function chooseFirstAddableCustomerFromModal() {
    const modalCard = page.getByRole('heading', { name: '添加稀客' }).first().locator('..').locator('..');
    const modalButtons = (await modalCard.getByRole('button').allInnerTexts())
      .map((text) => sanitizeName(text))
      .filter(Boolean);

    const candidateName = modalButtons.find(
      (name) => name !== '取消' && name !== '添加选中稀客',
    );
    if (!candidateName) return null;

    await modalCard.getByRole('button', { name: candidateName, exact: true }).click();
    await page.waitForTimeout(100);
    await modalCard.getByRole('button', { name: '添加选中稀客', exact: true }).click();
    await page.waitForTimeout(160);
    return candidateName;
  }

  const runDir = '__RUN_DIR__';
  const summary = {
    runDir,
    importedSampleSave: false,
    importedPopularFoodTag: null,
    importedPopularHateFoodTag: null,
    importedManagedSpecialCustomerVisible: false,
    hiddenUnexpectedSpecialCustomers: [],
    invalidConfigRejected: false,
    showRecipeProfitEnabled: false,
    normalProfitVisible: false,
    rareProfitVisible: false,
    normalRecipePricesAfterPriceSort: [],
    normalPriceSortedDesc: false,
    selectedRareCustomer: null,
    selectedRareFoodTag: null,
    selectedRareBevTag: null,
    rareRecipeFilterBefore: null,
    rareRecipeFilterAfter: null,
    rareFavoriteRecipeToggled: false,
    rareFavoriteBeverageToggled: false,
    rareAddedCustomerName: null,
    rareAddedCustomerRemoved: false,
    persistedProfitSwitchOn: false,
    normalRegions: [],
    rareRegion: null,
    rareCustomersExecuted: [],
    switchedSettingsCount: 0,
    visibleSwitchCount: 0,
    desktopReadyState: null,
    mobileReadyState: null,
    guideClosedBeforeScreenshots: true,
    errors: [],
  };

  await page.goto('http://127.0.0.1:4173/normal');
  await closeBlockingModal();

  // Collect available regions from selector options
  await page.getByRole('combobox').first().click();
  const allRegions = (await page.getByRole('option').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  await page.keyboard.press('Escape').catch(() => {});

  summary.normalRegions = pickRandom(allRegions, 3);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await closeBlockingModal();
  await page.screenshot({ path: `${runDir}/desktop-home.png`, type: 'png' });

  await page.goto('http://127.0.0.1:4173/settings');
  await closeBlockingModal();
  await page
    .locator('input[type="file"][accept=".memory"]')
    .first()
    .setInputFiles('.playwright-cli/Mystia#17.memory');
  await page.waitForTimeout(900);

  summary.importedSampleSave = await page
    .getByText(/导入成功/)
    .first()
    .isVisible()
    .catch(() => false);
  if (!summary.importedSampleSave) {
    summary.errors.push('示例存档导入成功提示未检测到');
  }

  summary.importedPopularFoodTag = await getLabeledComboboxValue('喜爱:');
  summary.importedPopularHateFoodTag = await getLabeledComboboxValue('厌恶:');
  if (!summary.importedPopularFoodTag || !summary.importedPopularHateFoodTag) {
    summary.errors.push('设置页未找到流行料理标签的两个选择框');
  } else if (isEmptyTagValue(summary.importedPopularFoodTag)) {
    summary.errors.push('示例存档导入后，流行喜爱标签为空');
  } else if (!isEmptyTagValue(summary.importedPopularFoodTag) && !isEmptyTagValue(summary.importedPopularHateFoodTag)) {
    summary.errors.push('示例存档导入后，流行喜好与厌恶同时出现');
  }

  await page.getByPlaceholder('IZK...').fill('invalid-config');
  await page.getByRole('button', { name: '导入', exact: true }).click();
  await page.waitForTimeout(180);
  summary.invalidConfigRejected = await page.getByText(/导入失败:/).first().isVisible().catch(() => false);
  if (!summary.invalidConfigRejected) {
    summary.errors.push('设置页对非法配置字符串未给出明确失败提示');
  }

  summary.showRecipeProfitEnabled = await ensureSettingSwitchEnabled('料理利润计算');
  if (!summary.showRecipeProfitEnabled) {
    summary.errors.push('设置页未能成功开启料理利润计算');
  }
  await closeBlockingModal();

  await closeBlockingModal();
  await page.screenshot({ path: `${runDir}/desktop-settings-after-import.png`, type: 'png' });

  const switches = page.getByRole('switch');
  const switchCount = await switches.count();
  summary.visibleSwitchCount = switchCount;
  for (let i = 0; i < switchCount; i++) {
    await closeBlockingModal();
    await switches.nth(i).click();
    await page.waitForTimeout(120);
    summary.switchedSettingsCount += 1;
    await closeBlockingModal();
  }

  summary.showRecipeProfitEnabled = await ensureSettingSwitchEnabled('料理利润计算');
  if (!summary.showRecipeProfitEnabled) {
    summary.errors.push('设置页遍历开关后，未能恢复料理利润计算开关');
  }
  await closeBlockingModal();

  await page.screenshot({ path: `${runDir}/desktop-settings-toggle.png`, type: 'png' });

  await page.goto('http://127.0.0.1:4173/normal');
  await closeBlockingModal();
  for (const region of summary.normalRegions) {
    await selectRegion(region);
    const ok = await page.getByRole('heading', { name: '普客推荐' }).isVisible().catch(() => false);
    if (!ok) summary.errors.push(`普客页切换地区后标题不可见: ${region}`);
  }

  if (summary.normalRegions.length > 0) {
    await selectRegion(summary.normalRegions[0]);
  }

  const normalRecipeCards = page.locator('div').filter({ has: page.getByText(/基础烹饪时间/) });
  const normalRecipeCardCount = await normalRecipeCards.count();
  if (normalRecipeCardCount === 0) {
    summary.errors.push('普客页未渲染任何料理推荐卡片');
  } else {
    await page.getByRole('button', { name: '价格优先', exact: true }).click();
    await page.waitForTimeout(150);
    summary.normalRecipePricesAfterPriceSort = await getNormalRecipeCardPrices(3);
    if (summary.normalRecipePricesAfterPriceSort.length >= 2) {
      summary.normalPriceSortedDesc = summary.normalRecipePricesAfterPriceSort[0] >= summary.normalRecipePricesAfterPriceSort[1];
      if (!summary.normalPriceSortedDesc) {
        summary.errors.push('普客页切换到价格优先后，料理结果未按价格降序显示');
      }
    }
  }

  summary.normalProfitVisible = await page.getByText(/利润 ¥/).first().isVisible().catch(() => false);
  if (summary.showRecipeProfitEnabled && !summary.normalProfitVisible) {
    summary.errors.push('开启料理利润计算后，普客页仍未显示利润字段');
  }

  await page.screenshot({ path: `${runDir}/desktop-normal-random.png`, type: 'png' });

  await page.goto('http://127.0.0.1:4173/rare');
  await closeBlockingModal();

  // Enable all hidden rare customers in filter panel (if exists)
  const filterButton = page.getByRole('button', { name: /过滤稀客|隐藏过滤/ });
  if ((await filterButton.count()) > 0) {
    await filterButton.first().click();
    await page.waitForTimeout(150);
    const hidePanel = page.locator('div').filter({ hasText: '隐藏未遇到的稀客' }).first();
    if ((await hidePanel.count()) > 0) {
      const hideSwitches = hidePanel.getByRole('switch');
      const hsCount = await hideSwitches.count();
      for (let i = 0; i < hsCount; i++) {
        const state = await hideSwitches.nth(i).getAttribute('aria-checked');
        if (state !== 'true') {
          await hideSwitches.nth(i).click();
          await page.waitForTimeout(30);
        }
      }
    }
    await filterButton.first().click().catch(() => {});
  }

  // Pick one random region then random 3 visible rare customers
  await page.getByRole('combobox').first().click();
  const rareRegions = (await page.getByRole('option').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  await page.keyboard.press('Escape').catch(() => {});
  summary.rareRegion = pickRandom(rareRegions, 1)[0] || rareRegions[0];
  if (summary.rareRegion) await selectRegion(summary.rareRegion);

  if (rareRegions.includes('人间之里')) {
    await selectRegion('人间之里');
  }

  const visibleSpecialCustomers = await Promise.all([
    page.getByRole('button', { name: /萌澄果/ }).first().isVisible().catch(() => false),
    page.getByRole('button', { name: /秦心/ }).first().isVisible().catch(() => false),
  ]);
  summary.importedManagedSpecialCustomerVisible = visibleSpecialCustomers.every(Boolean);
  if (!summary.importedManagedSpecialCustomerVisible) {
    summary.errors.push('示例存档导入后，未检测到已开启联动对应的特殊稀客');
  }

  const hiddenUnexpectedSpecialCustomers = [];
  for (const customerName of ['蹦蹦跳跳的三妖精', '时焉侑']) {
    const isVisible = await page.getByRole('button', { name: new RegExp(customerName) }).first().isVisible().catch(() => false);
    if (isVisible) {
      hiddenUnexpectedSpecialCustomers.push(customerName);
    }
  }
  summary.hiddenUnexpectedSpecialCustomers = hiddenUnexpectedSpecialCustomers;
  if (hiddenUnexpectedSpecialCustomers.length > 0) {
    summary.errors.push(`示例存档导入后，仍有不应显示的特殊稀客可见: ${hiddenUnexpectedSpecialCustomers.join('、')}`);
  }

  const addCustomerButton = page.getByRole('button', { name: '添加稀客', exact: true });
  if ((await addCustomerButton.count()) > 0 && (await addCustomerButton.first().isEnabled().catch(() => false))) {
    await addCustomerButton.first().click();
    await page.waitForTimeout(150);
    summary.rareAddedCustomerName = await chooseFirstAddableCustomerFromModal();
    if (!summary.rareAddedCustomerName) {
      summary.errors.push('打开添加稀客弹窗后，未找到可添加的稀客');
    } else {
      const addedChip = page.getByRole('button', { name: new RegExp(summary.rareAddedCustomerName) }).first();
      const addedChipVisible = await addedChip.isVisible().catch(() => false);
      if (!addedChipVisible) {
        summary.errors.push(`添加稀客后，未看到已添加标签: ${summary.rareAddedCustomerName}`);
      } else {
        await addedChip.click();
        await page.waitForTimeout(120);
        summary.rareAddedCustomerRemoved = !(await addedChip.isVisible().catch(() => false));
        if (!summary.rareAddedCustomerRemoved) {
          summary.errors.push(`移除已添加稀客失败: ${summary.rareAddedCustomerName}`);
        }
      }
    }
  } else {
    summary.errors.push('稀客页“添加稀客”入口不可用，无法覆盖该用户操作链路');
  }

  await page.getByRole('button', { name: /萌澄果/ }).first().click();
  await page.waitForTimeout(180);
  summary.selectedRareCustomer = '萌澄果';

  const chosenRareCombination = await chooseRareCombinationWithVisibleRecipes();
  if (!chosenRareCombination) {
    summary.errors.push('未能为萌澄果找到可见料理结果的点单组合');
  } else {
    summary.selectedRareFoodTag = chosenRareCombination.foodTag;
    summary.selectedRareBevTag = chosenRareCombination.bevTag;
    summary.rareRecipeFilterBefore = chosenRareCombination.recipeCounts;

    await page.getByRole('combobox').filter({ has: page.locator('span') }).nth(1).click().catch(() => {});
    await page.getByRole('option', { name: '低于0分', exact: true }).click().catch(() => {});
    await page.waitForTimeout(180);

    const relaxedRecipeHeadingText = await page.getByRole('heading', { name: /料理 \(/ }).first().innerText().catch(() => '');
    const relaxedRecipeCounts = parseRareRecipeCounts(relaxedRecipeHeadingText);
    summary.rareRecipeFilterAfter = relaxedRecipeCounts;
    if (!relaxedRecipeCounts) {
      summary.errors.push('稀客页切换料理过滤条件后，未能读取料理结果统计');
    } else if (relaxedRecipeCounts.visible < chosenRareCombination.recipeCounts.visible) {
      summary.errors.push('稀客页放宽料理过滤条件后，可见料理数量反而减少');
    }

    const favoriteRecipeButton = page.getByRole('button', { name: '收藏菜品' }).first();
    if (await favoriteRecipeButton.isVisible().catch(() => false)) {
      await favoriteRecipeButton.click();
      await page.waitForTimeout(120);
      summary.rareFavoriteRecipeToggled = await page.getByRole('button', { name: '取消收藏菜品' }).first().isVisible().catch(() => false);
      if (!summary.rareFavoriteRecipeToggled) {
        summary.errors.push('稀客页收藏菜品后，收藏状态未更新');
      }
    } else {
      summary.errors.push('稀客页未找到可收藏的料理项');
    }

    const favoriteBeverageButton = page.getByRole('button', { name: '收藏酒水' }).first();
    if (await favoriteBeverageButton.isVisible().catch(() => false)) {
      await favoriteBeverageButton.click();
      await page.waitForTimeout(120);
      summary.rareFavoriteBeverageToggled = await page.getByRole('button', { name: '取消收藏酒水' }).first().isVisible().catch(() => false);
      if (!summary.rareFavoriteBeverageToggled) {
        summary.errors.push('稀客页收藏酒水后，收藏状态未更新');
      }
    } else {
      summary.errors.push('稀客页未找到可收藏的酒水项');
    }

    summary.rareProfitVisible = await page.getByText(/利润 ¥/).first().isVisible().catch(() => false);
    if (summary.showRecipeProfitEnabled && !summary.rareProfitVisible) {
      summary.errors.push('开启料理利润计算后，稀客页仍未显示利润字段');
    }
  }

  if (summary.rareRegion && summary.rareRegion !== '人间之里') {
    await selectRegion(summary.rareRegion);
  }

  const customerButtons = page.locator('button').filter({ has: page.locator('span[style*="customer_rare.png"]') });
  const customerCount = await customerButtons.count();
  const candidates = [];
  for (let i = 0; i < customerCount; i++) {
    const txt = sanitizeName(await customerButtons.nth(i).innerText());
    if (txt) candidates.push({ index: i, name: txt });
  }
  const pickedCustomers = pickRandom(candidates, 3);

  for (const customer of pickedCustomers) {
    await closeBlockingModal();
    await customerButtons.nth(customer.index).click();
    await page.waitForTimeout(220);

    const foodButtons = page
      .locator('p', { hasText: '点单料理 Tag:' })
      .first()
      .locator('..')
      .getByRole('button');
    const bevButtons = page
      .locator('p', { hasText: '点单酒水 Tag:' })
      .first()
      .locator('..')
      .getByRole('button');

    const foodCount = await foodButtons.count();
    const bevCount = await bevButtons.count();
    if (foodCount === 0 || bevCount === 0) {
      summary.errors.push(`稀客词条按钮缺失: ${customer.name}`);
      continue;
    }

    const foodIdx = Math.floor(Math.random() * foodCount);
    const bevIdx = Math.floor(Math.random() * bevCount);
    const foodTag = sanitizeName(await foodButtons.nth(foodIdx).innerText());
    const bevTag = sanitizeName(await bevButtons.nth(bevIdx).innerText());

    await closeBlockingModal();
    await foodButtons.nth(foodIdx).click();
    await page.waitForTimeout(120);
    await closeBlockingModal();
    await bevButtons.nth(bevIdx).click();
    await page.waitForTimeout(120);

    summary.rareCustomersExecuted.push({ name: customer.name, foodTag, bevTag });
  }

  await closeBlockingModal();
  await page.screenshot({ path: `${runDir}/desktop-rare-random.png`, type: 'png' });

  summary.desktopReadyState = await page.evaluate(() => document.readyState);

  await page.setViewportSize({ width: 720, height: 1600 });

  // Mobile quick browse + minimal interactions
  await page.goto('http://127.0.0.1:4173/normal');
  await closeBlockingModal();
  if (summary.normalRegions.length > 0) {
    await selectRegion(summary.normalRegions[0]);
  }
  await page.screenshot({ path: `${runDir}/mobile-normal.png`, type: 'png' });

  await page.goto('http://127.0.0.1:4173/rare');
  await closeBlockingModal();
  if (summary.rareRegion) {
    await selectRegion(summary.rareRegion);
  }
  if (summary.rareCustomersExecuted.length > 0) {
    const firstName = summary.rareCustomersExecuted[0].name;
    const firstBtn = page.getByRole('button', { name: new RegExp(firstName) }).first();
    if (await firstBtn.isVisible().catch(() => false)) {
      await firstBtn.click();
      await page.waitForTimeout(150);
    }
  }
  await page.screenshot({ path: `${runDir}/mobile-rare.png`, type: 'png' });

  await page.goto('http://127.0.0.1:4173/settings');
  await closeBlockingModal();
  summary.persistedProfitSwitchOn = await isSettingSwitchChecked('料理利润计算');
  if (!summary.persistedProfitSwitchOn) {
    summary.errors.push('跨页操作后，料理利润计算开关状态未保持');
  }
  await page.screenshot({ path: `${runDir}/mobile-settings.png`, type: 'png' });

  summary.mobileReadyState = await page.evaluate(() => document.readyState);

  if (summary.visibleSwitchCount < 3) {
    summary.errors.push(`设置页可见开关不足3个，实际仅${summary.visibleSwitchCount}个`);
  }

  return summary;
}
