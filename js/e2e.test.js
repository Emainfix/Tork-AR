const { test, expect } = require('@playwright/test');

test.describe('Tork AR App - Pruebas de Usuario', () => {
    test.beforeEach(async ({ page }) => {
        // Ajustar a la URL de desarrollo local
        await page.goto('http://localhost:5173/?id=tork-matic-dispensador-rollo');
    });

    test('debe cargar el producto y mostrar el título correcto', async ({ page }) => {
        const title = page.locator('#product-title');
        await expect(title).toContainText('Tork Matic');

        const viewer = page.locator('#product-viewer');
        await expect(viewer).toHaveAttribute('src', /.*\.glb/);
    });

    test('debe cambiar el color del modelo al interactuar con los botones', async ({ page }) => {
        const whiteBtn = page.locator('.color-btn[data-color="white"]');
        if (await whiteBtn.isVisible()) {
            await whiteBtn.click();
            const viewer = page.locator('#product-viewer');
            await expect(viewer).toHaveAttribute('src', /.*Blanco.*\.glb/);
        }
    });

    test('debe abrir el menú de opciones (FAB) correctamente', async ({ page }) => {
        const fab = page.locator('#toggle-fab');
        await fab.click();

        const menu = page.locator('#fab-menu');
        await expect(menu).toHaveClass(/expanded/);

        const btnMedidas = page.locator('#btn-medidas');
        await expect(btnMedidas).toBeVisible();
    });

    test('debe mostrar las líneas de dimensiones al activar Medidas', async ({ page }) => {
        await page.locator('#toggle-fab').click();
        await page.locator('#btn-medidas').click();

        const label = page.locator('#medidas-label');
        await expect(label).toHaveText('Cerrar');

        // Verificar que el contenedor de líneas SVG ya no está oculto
        const dimLines = page.locator('#dimLines');
        await expect(dimLines).not.toHaveClass(/hide/);
    });
});