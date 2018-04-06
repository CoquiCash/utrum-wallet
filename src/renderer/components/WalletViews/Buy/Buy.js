import Select2 from '@/components/Utils/Select2/Select2.vue';
import SelectAwesome from '@/components/Utils/SelectAwesome/SelectAwesome.vue';
import TransactionHistory from '@/components/TransactionHistory/TransactionHistory.vue';

const sb = require('satoshi-bitcoin');
const { clipboard } = require('electron');

export default {
  name: 'buy',
  components: {
    select2: Select2,
    'select-awesome': SelectAwesome,
    'transaction-history': TransactionHistory,
  },
  data() {
    return {
      searchable: false,
      currentBonus: 0,
      blocks: 1,
      fee: 0,
      estimatedFee: 0,
      preparedTx: {},
      feeSpeed: 'veryFast',
      fees: [
        { id: 0, label: 'Very fast', blocks: 1, value: 'veryFast' },
        { id: 1, label: 'Fast', blocks: 6, value: 'fast' },
        { id: 2, label: 'Low', blocks: 36, value: 'low' },
      ],
      selectedFee: null,
      listData: [
        'BTC',
        'KMD',
      ],
      select: 'BTC',
      packageMNZ: 100000000000,
      packageIncrement: 50000000000,
      coupon: '',
    };
  },
  mounted() {
    this.selectFee = this.fees[0].label;
  },
  methods: {
    numberWithSpaces(x) {
      const parts = x.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return parts.join('.');
    },
    onFeeChange(data) {
      this.blocks = data.blocks;
      this.prepareTx();
    },
    async onShowBuyModal() {
      await this.prepareTx();

      if (!this.preparedTx.inputs && !this.preparedTx.ouputs) {
        this.hideModal();
        this.$toasted.info("You don't have enough funds for buying (with fees included)");
      } else {
        this.$refs.confirmBuy.show();
      }
    },
    async prepareTx() {
      const tx = await this.estimateTransaction();
      if (tx.alphaTx.ouputs && tx.alphaTx.inputs) {
        this.estimatedFee = sb.toBitcoin(tx.alphaTx.fee);
      }
      this.preparedTx = tx.alphaTx;
    },
    hideModal() {
      this.$refs.confirmBuy.hide();
    },
    methodToRunOnSelect(payload) {
      this.object = payload;
    },
    totalPrice() {
      const config = this.getConfig;

      let price = 0;
      const priceMNZ = config.coinPrices.mnz;
      const priceKMD = config.coinPrices.kmd;
      if (this.select === 'BTC') {
        price = priceMNZ;
      } else if (this.select === 'KMD') {
        price = sb.toSatoshi(priceMNZ / priceKMD);
      }
      return sb.toBitcoin((sb.toBitcoin(this.packageMNZ) * price).toFixed(0));
    },
    valueChange(value) {
      this.select = value;
    },
    incrementPackage() {
      if (this.packageMNZ <= this.getMaxBuy - this.packageIncrement) {
        this.packageMNZ += this.packageIncrement;
      }
    },
    decrementPackage() {
      if (this.packageMNZ > this.getMinBuy) {
        this.packageMNZ -= this.packageIncrement;
      }
    },
    async estimateTransaction() {
      return await this.$store.dispatch('prepareTransaction', {
        wallet: this.wallet,
        address: this.buyAddress,
        amount: sb.toSatoshi(this.getTotalPrice),
        blocks: this.blocks,
        data: this.coupon,
      });
    },
    async buyMnz() {
      await this.prepareTx();
      const payload = {
        wallet: this.wallet,
        ...this.preparedTx,
        amountMnz: this.totalMnzWitBonus,
      };

      this.$store
      .dispatch('buyAsset', payload)
      .then(response => {
        if (response.error) {
          this.$toasted.error(response.error);
          Promise.reject();
        }
        this.$toasted.show('Transaction sent !', {
          icon: 'done',
          action: [
            {
              icon: 'close',
              onClick: (e, toastObject) => {
                toastObject.goAway(0);
              },
            },
            {
              icon: 'content_copy',
              onClick: (e, toastObject) => {
                toastObject.goAway(0);
                clipboard.writeText(response);
                setTimeout(() => {
                  this.$toasted.show('Copied !', {
                    duration: 1000,
                    icon: 'done',
                  });
                }, 800);
              },
            },
          ],
        });
      }).catch(error => {
        this.$toasted.error(error.msg);
      })
      ;
      this.hideModal();
    },
  },
  watch: {
    packageMNZ: (newValue) => {
      const value = Number(newValue);

      if (value <= this.getMaxBuy - this.packageIncrement) {
        this.packageMNZ = value;
      } else {
        this.packageMNZ = this.getMaxBuy;
      }
      if (value <= 0) {
        this.packageMNZ = 0;
      }
    },
  },
  computed: {
    totalMnzWitBonus() {
      return this.getPackage + (this.getPackage * this.currentBonus);
    },
    getPackage: {
      get: function () {
        return sb.toBitcoin(this.packageMNZ);
      },
      set: function (newValue) {
        const value = sb.toSatoshi(newValue);

        if (value >= this.getMaxBuy) {
          this.packageMNZ = this.getMaxBuy;
        } else if (value <= this.getMinBuy || value <= 0) {
          this.packageMNZ = this.getMinBuy;
        } else {
          this.packageMNZ = value;
        }
      },
    },
    getMinBuy() {
      return sb.toSatoshi(this.$store.getters.getConfig.minBuy);
    },
    getMaxBuy() {
      return sb.toSatoshi(this.$store.getters.getConfig.maxBuy);
    },
    getConfig() {
      return this.$store.getters.getConfig;
    },
    wallet() {
      return this.$store.getters.getWalletByTicker(this.select);
    },
    walletMnz() {
      return this.$store.getters.getWalletByTicker('MNZ');
    },
    getBalance() {
      return this.$store.getters.getWalletByTicker(this.select).balance.toFixed(8);
    },
    getMnzBalance() {
      return this.$store.getters.getWalletByTicker('MNZ').balance;
    },
    getStringTicket() {
      return this.$store.getters.getWalletByTicker(this.select).coin.name;
    },
    getTotalPrice() {
      return this.totalPrice();
    },
    getTotalPriceWithFee() {
      return (this.getTotalPrice + this.estimatedFee).toFixed(8);
    },
    isBonus() {
      const date = new Date().getTime() / 1000;
      const config = this.$store.getters.getConfig;
      const bonuses = config.bonuses;
      let findDuration = true;

      Object.keys(bonuses).forEach(k => {
        if (this.select.toLowerCase() === k) {
          Object.keys(bonuses[k]).forEach(j => {
            if (findDuration) {
              const duration = bonuses[k][j].duration * 3600;
              const value = bonuses[k][j].value;
              const icoStart = config.icoStartDate;

              if (icoStart < date && date < icoStart + duration) {
                this.currentBonus = value / 100;
                findDuration = false;
              } else {
                this.currentBonus = 0;
              }
            }
          });
        }
      });

      return this.currentBonus !== 0;
    },
    canBuy() {
      const mnzToBuy = this.packageMNZ;
      const balance = this.$store.getters.getWalletByTicker(this.select).balance;

      return mnzToBuy <= 0 || this.totalPrice() > balance;
    },
  },
};