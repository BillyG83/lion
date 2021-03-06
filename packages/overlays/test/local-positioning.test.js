/* eslint-disable lit-a11y/click-events-have-key-events */
import { expect, fixture, fixtureSync } from '@open-wc/testing';
import { html } from 'lit/static-html.js';
import { OverlayController } from '../src/OverlayController.js';
import { normalizeTransformStyle } from './utils-tests/local-positioning-helpers.js';

/**
 * @typedef {import('../types/OverlayConfig').OverlayConfig} OverlayConfig
 * @typedef {import('../types/OverlayConfig').ViewportPlacement} ViewportPlacement
 */

const withLocalTestConfig = () =>
  /** @type {OverlayConfig} */ ({
    placementMode: 'local',
    contentNode: /** @type {HTMLElement} */ (fixtureSync(html` <div>my content</div> `)),
    invokerNode: /** @type {HTMLElement} */ (
      fixtureSync(html` <div role="button" style="width: 100px; height: 20px;">Invoker</div> `)
    ),
  });

describe('Local Positioning', () => {
  // Please use absolute positions in the tests below to prevent the HTML generated by
  // the test runner from interfering.
  describe('Positioning', () => {
    it('creates a Popper instance on the controller when shown, keeps it when hidden', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
      });
      await ctrl.show();
      expect(ctrl._popper.state.modifiersData).to.exist;
      await ctrl.hide();
      expect(ctrl._popper.state.modifiersData).to.exist;
    });

    it('positions correctly', async () => {
      // smoke test for integration of popper
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 30px; background: green;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div role="button" style="width: 20px; height: 10px; background: orange;"></div>
          `)
        ),
      });
      await fixture(html`
        <div style="position: fixed; left: 100px; top: 100px;">
          ${ctrl.invokerNode}${ctrl.content}
        </div>
      `);
      await ctrl.show();

      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate(-30px, -18px)',
        'translate should be -30px [to center = (80 - 20)/2*-1], -18px [to place above = 10 invoker height + 8 default padding]',
      );
    });

    it('uses top as the default placement', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div
              role="button"
              style="width: 100px; height: 20px;"
              @click=${() => ctrl.show()}
            ></div>
          `)
        ),
      });
      await fixture(html`
        <div style="position: fixed; left: 100px; top: 100px;">
          ${ctrl.invokerNode}${ctrl.content}
        </div>
      `);
      await ctrl.show();
      expect(ctrl.content.getAttribute('data-popper-placement')).to.equal('top');
    });

    it('positions to preferred place if placement is set and space is available', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div
              role="button"
              style="width: 100px; height: 20px;"
              @click=${() => ctrl.show()}
            ></div>
          `)
        ),
        popperConfig: {
          placement: 'left-start',
        },
      });
      await fixture(html`
        <div style="position: absolute; left: 120px; top: 50px;">
          ${ctrl.invokerNode}${ctrl.content}
        </div>
      `);

      await ctrl.show();
      expect(ctrl.content.getAttribute('data-popper-placement')).to.equal('left-start');
    });

    it('positions to different place if placement is set and no space is available', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;">invoker</div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div role="button" style="width: 100px; height: 20px;" @click=${() => ctrl.show()}>
              content
            </div>
          `)
        ),
        popperConfig: {
          placement: 'left',
        },
      });
      await fixture(html`
        <div style="position: absolute; top: 50px;">${ctrl.invokerNode}${ctrl.content}</div>
      `);

      await ctrl.show();
      expect(ctrl.content.getAttribute('data-popper-placement')).to.equal('right');
    });

    it('allows the user to override default Popper modifiers', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div
              role="button"
              style="width: 100px; height: 20px;"
              @click=${() => ctrl.show()}
            ></div>
          `)
        ),
        popperConfig: {
          modifiers: [
            {
              name: 'keepTogether',
              enabled: false,
            },
            { name: 'offset', enabled: true, options: { offset: [0, 16] } },
          ],
        },
      });
      await fixture(html`
        <div style="position: absolute; left: 100px; top: 50px;">
          ${ctrl.invokerNode}${ctrl.content}
        </div>
      `);

      await ctrl.show();
      expect(ctrl._popper.state.modifiersData.offset.auto).to.eql({ x: 0, y: 16 });
    });

    it('positions the Popper element correctly on show', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div
              role="button"
              style="width: 100px; height: 20px;"
              @click=${() => ctrl.show()}
            ></div>
          `)
        ),
        popperConfig: {
          placement: 'top',
        },
      });
      await fixture(html`
        <div style="position: absolute; top: 300px; left: 100px;">
          ${ctrl.invokerNode}${ctrl.content}
        </div>
      `);
      await ctrl.show();
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate(10px, -28px)',
        'Popper positioning values',
      );

      await ctrl.hide();
      await ctrl.show();
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate(10px, -28px)',
        'Popper positioning values should be identical after hiding and showing',
      );
    });

    // TODO: Reenable test and make sure it passes
    it.skip('updates placement properly even during hidden state', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div
              role="button"
              style="width: 100px; height: 20px;"
              @click=${() => ctrl.show()}
            ></div>
          `)
        ),
        popperConfig: {
          placement: 'top',
          modifiers: [
            {
              name: 'offset',
              enabled: true,
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      });
      await fixture(html`
        <div style="position: absolute; top: 300px; left: 100px;">
          ${ctrl.invokerNode} ${ctrl.content}
        </div>
      `);

      await ctrl.show();
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate3d(10px, -30px, 0px)',
        'Popper positioning values',
      );

      await ctrl.hide();
      await ctrl.updateConfig({
        popperConfig: {
          modifiers: [
            {
              name: 'offset',
              enabled: true,
              options: {
                offset: [0, 20],
              },
            },
          ],
        },
      });
      await ctrl.show();
      expect(ctrl._popper.options.modifiers.offset.offset).to.equal('0, 20px');
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate3d(10px, -40px, 0px)',
        'Popper positioning Y value should be 10 less than previous, due to the added extra 10px offset',
      );
    });

    // TODO: Not yet implemented
    it.skip('updates positioning correctly during shown state when config gets updated', async () => {
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        contentNode: /** @type {HTMLElement} */ (
          fixtureSync(html` <div style="width: 80px; height: 20px;"></div> `)
        ),
        invokerNode: /** @type {HTMLElement} */ (
          fixtureSync(html`
            <div role="button" style="width: 100px; height: 20px;" @click=${() => ctrl.show()}>
              Invoker
            </div>
          `)
        ),
        popperConfig: {
          placement: 'top',
          modifiers: [
            {
              name: 'offset',
              enabled: true,
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      });
      await fixture(html`
        <div style="position: absolute; top: 300px; left: 100px;">
          ${ctrl.invokerNode} ${ctrl.content}
        </div>
      `);

      await ctrl.show();
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate3d(10px, -30px, 0px)',
        'Popper positioning values',
      );

      await ctrl.updateConfig({
        popperConfig: {
          modifiers: [{ name: 'offset', enabled: true, options: { offset: [0, 20] } }],
        },
      });
      expect(normalizeTransformStyle(ctrl.content.style.transform)).to.equal(
        'translate3d(10px, -40px, 0px)',
        'Popper positioning Y value should be 10 less than previous, due to the added extra 10px offset',
      );
    });

    it('can set the contentNode minWidth as the invokerNode width', async () => {
      const invokerNode = /** @type {HTMLElement} */ (
        await fixture(html` <div role="button" style="width: 60px;">invoker</div> `)
      );
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        inheritsReferenceWidth: 'min',
        invokerNode,
      });
      await ctrl.show();
      expect(ctrl.content.style.minWidth).to.equal('60px');
    });

    it('can set the contentNode maxWidth as the invokerNode width', async () => {
      const invokerNode = /** @type {HTMLElement} */ (
        await fixture(html` <div role="button" style="width: 60px;">invoker</div> `)
      );
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        inheritsReferenceWidth: 'max',
        invokerNode,
      });
      await ctrl.show();
      expect(ctrl.content.style.maxWidth).to.equal('60px');
    });

    it('can set the contentNode width as the invokerNode width', async () => {
      const invokerNode = /** @type {HTMLElement} */ (
        await fixture(html` <div role="button" style="width: 60px;">invoker</div> `)
      );
      const ctrl = new OverlayController({
        ...withLocalTestConfig(),
        inheritsReferenceWidth: 'full',
        invokerNode,
      });
      await ctrl.show();
      expect(ctrl.content.style.width).to.equal('60px');
    });
  });
});
